import Container, { Service, Token } from 'typedi';
import Logger from '@/core/logger';
import { sleep, toPagingOutput } from '@/utils/common';
import { $pagination, $keysToProject, $lookup } from '@/utils/mongoDB';
import { AssetError, assetErrors, AssetModel, assetModelToken } from '.';
import { BaseServiceInput, assetSortBy, RemoveSlugPattern } from '@/types/Common';
import { chunk, isNil, omitBy, uniq } from 'lodash';
import { _asset } from '@/modules';
import { env } from 'process';
import slugify from 'slugify';
import { FETCH_MARKET_DATA_DURATION } from './asset.constants';
import { Job, JobsOptions, Queue, QueueEvents, QueueScheduler, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { AssetJobData, AssetJobNames } from './asset.job';
import { CoinMarketCapAPI } from '@/common/api';
import { DIRedisConnection } from '@/loaders/redisClientLoader';
import { AssetPriceModel, assetPriceModelToken } from '../asset-price';

/**
 * @class AssetService
 * @extends  BaseService
 * @description Asset Service for all asset related operations
 */
export class AssetService {
  private logger = new Logger('AssetService');

  readonly model = Container.get<AssetModel>(assetModelToken);

  private assetPriceModel = Container.get<AssetPriceModel>(assetPriceModelToken);

  private readonly redisConnection: IORedis.Redis = Container.get(DIRedisConnection);

  private worker: Worker;

  private queue: Queue;

  private queueScheduler: QueueScheduler;

  private readonly jobs: {
    [key in AssetJobNames | 'default']: () => Promise<void>;
  } = {
    'asset:fetch:marketData': this.fetchMarketData,
    'asset:fetch:pricePerformanceStats': this.fetchPricePerformanceStats,
    'asset:fetch:ohlcv': this.fetchOHLCV,
    default: () => {
      throw new Error('Invalid job name');
    },
  };

  constructor() {
    // this.fetchMarketData();
    // this.fetchPricePerformanceStats();
    // this.fetchOHLCV();
    // this.fetchMetadata();
    if (env.MODE === 'production') {
      // Init Worker
      this.initWorker();
      // Init Queue
      this.initQueue();
    }
  }
  /**
   *  @description init BullMQ Worker
   */
  private initWorker() {
    this.worker = new Worker('asset', this.workerProcessor.bind(this), {
      connection: this.redisConnection as any,
      lockDuration: 1000 * 60,
      concurrency: 20,
      limiter: {
        max: 1,
        duration: FETCH_MARKET_DATA_DURATION,
      },
    });
    this.logger.debug('info', '[initWorker:asset]', 'Worker initialized');

    this.initWorkerListeners(this.worker);
  }
  /**
   *  @description init BullMQ Queue
   */
  private initQueue() {
    this.queue = new Queue('asset', {
      connection: this.redisConnection as any,
      defaultJobOptions: {
        // The total number of attempts to try the job until it completes
        attempts: 3,
        // Backoff setting for automatic retries if the job fails
        backoff: { type: 'exponential', delay: 3000 },
      },
    });
    this.queueScheduler = new QueueScheduler('asset', {
      connection: this.redisConnection as any,
    });
    const queueEvents = new QueueEvents('asset', {
      connection: this.redisConnection as any,
    });

    this.addFetchingDataJob();

    // queueEvents.on('completed', ({ jobId }) => {
    //   this.logger.debug('success', 'Job completed', { jobId });
    // });

    queueEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      this.logger.discord('error', 'asset:Job failed', jobId, failedReason);
    });
  }

  private addFetchingDataJob() {
    this.addJob({
      name: 'asset:fetch:marketData',
      payload: {},
      options: {
        repeat: {
          every: 21600000,
        },
        jobId: 'asset:fetch:marketData',
        removeOnComplete: true,
      },
    });
    this.addJob({
      name: 'asset:fetch:pricePerformanceStats',
      payload: {},
      options: {
        repeat: {
          pattern: '* 0 0 * * *',
        },
        jobId: 'asset:fetch:pricePerformanceStats',
        removeOnComplete: true,
      },
    });
  }

  /**
   *
   * @description fetch market data from CoinMarketCap api
   */
  async fetchMarketData({
    page = 1,
    per_page = CoinMarketCapAPI.cryptocurrency.LIMIT,
    delay = 300,
  }: {
    page?: number;
    per_page?: number;
    delay?: number;
  } = {}): Promise<void> {
    await sleep(delay);
    try {
      // this.logger.debug('success', 'fetchMarketData', { page, per_page });
      const [{ paging: [{ total_count = 0 } = {}] = [{ total_count: 0 }], items }] = await this.model
        .get([
          ...$pagination({
            $match: {
              'id_of_sources.CoinMarketCap': { $exists: true },
            },
            $projects: [
              {
                $project: {
                  symbol: 1,
                },
              },
            ],
            ...(per_page && page && { items: [{ $skip: +per_page * (+page - 1) }, { $limit: +per_page }] }),
          }),
        ])
        .toArray();
      if (items.length) {
        const listSymbol = items.map((item: any) => item.symbol);
        const {
          data: { data: quotesLatest },
        } = await CoinMarketCapAPI.fetch({
          endpoint: CoinMarketCapAPI.cryptocurrency.quotesLatest,
          params: {
            symbol: uniq(listSymbol).join(','),
            aux: 'num_market_pairs,cmc_rank,date_added,tags,platform,max_supply,circulating_supply,total_supply,market_cap_by_total_supply,volume_24h_reported,volume_7d,volume_7d_reported,volume_30d,volume_30d_reported,is_active,is_fiat',
          },
        });
        for (const symbol of Object.keys(quotesLatest)) {
          for (const {
            circulating_supply,
            total_supply,
            max_supply,
            num_market_pairs,
            tvl_ratio,
            self_reported_circulating_supply,
            self_reported_market_cap,
            cmc_rank,
            quote: {
              USD: {
                price,
                volume_24h,
                volume_change_24h,
                percent_change_1h,
                percent_change_24h,
                percent_change_7d,
                percent_change_30d,
                percent_change_60d,
                percent_change_90d,
                market_cap,
                market_cap_dominance,
                fully_diluted_market_cap,
                tvl,
                last_updated,
                volume_24h_reported,
                volume_7d_reported,
                volume_30d_reported,
                market_cap_by_total_supply,
              },
            },
            name,
            slug,
            id,
          } of quotesLatest[symbol]) {
            const marketData = omitBy(
              {
                'market_data.USD.last_updated': last_updated,

                'market_data.USD.tvl': tvl,

                'market_data.USD.1h.percent_change': percent_change_1h,

                'market_data.USD.24h.volume': volume_24h,
                'market_data.USD.24h.volume_change': volume_change_24h,
                'market_data.USD.24h.percent_change': percent_change_24h,
                'market_data.USD.24h.volume_reported': volume_24h_reported,

                'market_data.USD.7d.percent_change': percent_change_7d,
                'market_data.USD.7d.volume_reported': volume_7d_reported,

                'market_data.USD.30d.percent_change': percent_change_30d,
                'market_data.USD.30d.volume_reported': volume_30d_reported,

                'market_data.USD.60d.percent_change': percent_change_60d,
                'market_data.USD.90d.percent_change': percent_change_90d,
              },
              isNil,
            );

            const assetMarketData = omitBy(
              {
                tvl_ratio,
                num_market_pairs,
                market_cap,
                self_reported_market_cap,
                market_cap_dominance,
                fully_diluted_market_cap,
                market_cap_by_total_supply,
                total_supply,
                circulating_supply,
                self_reported_circulating_supply,
                max_supply,
                price,
                cmc_rank,
                volume_24h,
                volume_change_24h,
                percent_change_24h,
                percent_change_7d,
                percent_change_30d,
                percent_change_60d,
                percent_change_90d,
              },
              isNil,
            );
            const {
              lastErrorObject: { updatedExisting: updatedAssetExisting },
            } = await this.model._collection.findOneAndUpdate(
              {
                $or: [
                  { name: { $regex: `^${name}$`, $options: 'i' } },
                  { name },
                  { slug },
                  {
                    slug: {
                      $regex: `^${slugify(name, { trim: true, lower: true, remove: RemoveSlugPattern })}$`,
                      $options: 'i',
                    },
                  },
                ],
              },
              {
                $set: {
                  'id_of_sources.CoinMarketCap': String(id),
                  ...assetMarketData,
                  updated_at: new Date(),
                  updated_by: 'system',
                },
              },
            );
            const {
              lastErrorObject: { updatedExisting: updatedAssetPriceExisting },
            } = await this.assetPriceModel._collection.findOneAndUpdate(
              {
                $or: [
                  { name: { $regex: `^${name}$`, $options: 'i' } },
                  {
                    slug: {
                      $regex: `^${slug}$`,
                      $options: 'i',
                    },
                  },
                  { name },
                  { slug },
                ],
              },
              {
                $set: {
                  ...marketData,
                  'id_of_sources.CoinMarketCap': String(id),
                  updated_at: new Date(),
                  updated_by: 'system',
                },
              },
              {
                upsert: false,
              },
            );
            if (!updatedAssetExisting) {
              await this.model._collection.findOneAndUpdate(
                {
                  $or: [
                    { name: { $regex: `^${name}$`, $options: 'i' } },
                    {
                      slug: {
                        $regex: `^${slug}$`,
                        $options: 'i',
                      },
                    },
                    { name },
                    { slug },
                  ],
                },
                {
                  $setOnInsert: {
                    'id_of_sources.CoinMarketCap': String(id),
                    name,
                    symbol: symbol,
                    slug,
                    ...assetMarketData,
                    trans: [] as any,
                    deleted: false,
                    created_at: new Date(),
                    updated_at: new Date(),
                    created_by: 'system',
                    categories: [],
                  },
                },
                {
                  upsert: true,
                },
              );
            }
            if (!updatedAssetPriceExisting) {
              await this.assetPriceModel._collection.findOneAndUpdate(
                {
                  $or: [
                    { name: { $regex: `^${name}$`, $options: 'i' } },
                    {
                      slug: {
                        $regex: `^${slug}$`,
                        $options: 'i',
                      },
                    },
                    { name },
                    { slug },
                  ],
                },
                {
                  $setOnInsert: {
                    name,
                    'id_of_sources.CoinMarketCap': String(id),
                    symbol: symbol,
                    ...marketData,
                    slug,
                    deleted: false,
                    created_at: new Date(),
                    updated_at: new Date(),
                    created_by: 'system',
                  },
                },
                {
                  upsert: true,
                },
              );
            }
          }
        }
        // this.logger.debug('success', { items: items.length, total_count });
        await this.fetchMarketData({
          page: page + 1,
          per_page,
        });
      } else {
        this.logger.debug('success', { total_count });
      }
    } catch (err) {
      this.logger.discord('job_error', 'asset:fetchMarketData', JSON.stringify(err));
      // throw err;
    }
  }
  /**
   *
   * @description fetch OHLCV from CoinMarketCap api
   */
  async fetchOHLCV({
    page = 1,
    per_page = CoinMarketCapAPI.cryptocurrency.LIMIT,
    delay = 300,
  }: {
    page?: number;
    per_page?: number;
    delay?: number;
  } = {}): Promise<void> {
    await sleep(delay);
    try {
      const [{ paging: [{ total_count = 0 } = {}] = [{ total_count: 0 }], items }] = await this.model
        .get([
          ...$pagination({
            $match: {
              'id_of_sources.CoinMarketCap': { $exists: true },
            },
            $projects: [
              {
                $project: {
                  symbol: 1,
                },
              },
            ],
            ...(per_page && page && { items: [{ $skip: +per_page * (+page - 1) }, { $limit: +per_page }] }),
          }),
        ])
        .toArray();
      if (items.length) {
        const listSymbol = items.map((item: any) => item.symbol);
        const {
          data: { data: ohlcvLastest },
        } = await CoinMarketCapAPI.fetch({
          endpoint: CoinMarketCapAPI.cryptocurrency.ohlcvLastest,
          params: {
            symbol: uniq(listSymbol).join(','),
          },
        });
        for (const symbol of Object.keys(ohlcvLastest)) {
          // this.logger.debug('success', { symbol });
          for (const {
            quote: {
              USD: { open, high, low, close, volume },
            },
            name,
            slug,
            id,
          } of ohlcvLastest[symbol]) {
            this.logger.debug('success', { name });
            const assetExisting = await this.model._collection.findOne({
              $or: [
                { name: { $regex: `^${name}$`, $options: 'i' } },
                {
                  slug: {
                    $regex: `^${slug}$`,
                    $options: 'i',
                  },
                },
                { name },
                { slug },
              ],
            });
            const marketData = omitBy(
              {
                'market_data.USD.open': open,
                'market_data.USD.high': high,
                'market_data.USD.low': low,
                'market_data.USD.close': close,
                'market_data.USD.volume': volume,
              },
              isNil,
            );

            const {
              value,
              ok,
              lastErrorObject: { updatedAssetPriceExisting },
            } = await this.assetPriceModel._collection.findOneAndUpdate(
              {
                $or: [
                  { name: { $regex: `^${name}$`, $options: 'i' } },
                  {
                    slug: {
                      $regex: `^${slug}$`,
                      $options: 'i',
                    },
                  },
                  { name },
                  { slug },
                ],
              },
              {
                $set: {
                  ...marketData,
                  'id_of_sources.CoinMarketCap': String(id),
                  updated_at: new Date(),
                  updated_by: 'system',
                },
              },
              {
                upsert: false,
              },
            );
            if (!assetExisting) {
              await this.model._collection.findOneAndUpdate(
                {
                  $or: [
                    { name: { $regex: `^${name}$`, $options: 'i' } },
                    {
                      slug: {
                        $regex: `^${slug}$`,
                        $options: 'i',
                      },
                    },
                    { name },
                    { slug },
                  ],
                },
                {
                  $setOnInsert: {
                    'id_of_sources.CoinMarketCap': String(id),
                    ...marketData,
                    name,
                    slug,
                    trans: [] as any,
                    deleted: false,
                    created_at: new Date(),
                    updated_at: new Date(),
                    created_by: 'system',
                    categories: [],
                  },
                },
                {
                  upsert: true,
                },
              );
            }
            if (!updatedAssetPriceExisting) {
              await this.assetPriceModel._collection.findOneAndUpdate(
                {
                  $or: [
                    { name: { $regex: `^${name}$`, $options: 'i' } },
                    {
                      slug: {
                        $regex: `^${slug}$`,
                        $options: 'i',
                      },
                    },
                    { name },
                    { slug },
                  ],
                },
                {
                  $setOnInsert: {
                    'id_of_sources.CoinMarketCap': String(id),
                    name,
                    slug,
                    ...marketData,
                    deleted: false,
                    created_at: new Date(),
                    updated_at: new Date(),
                    created_by: 'system',
                  },
                },
                {
                  upsert: true,
                },
              );
            }
          }
        }
        await this.fetchOHLCV({
          page: page + 1,
          per_page,
        });
      } else {
        this.logger.debug('success', 'asset:fetchMarketData', { total_count });
        return;
      }
    } catch (err) {
      this.logger.discord('job_error', 'asset:fetchMarketData', JSON.stringify(err));
      // throw err;
    }
  }

  async fetchPricePerformanceStats() {
    try {
      this.logger.debug('info', 'fetchPricePerformanceStats start');
      const allAssets = await this.model
        .get([
          {
            $match: {
              'id_of_sources.CoinMarketCap': { $exists: true },
            },
          },
        ])
        .toArray();
      const groupAssets = chunk(allAssets, CoinMarketCapAPI.cryptocurrency.pricePerformanceStatsLimit);
      for (const assets of groupAssets) {
        const listSymbol = assets.map((asset) => asset.symbol);
        await sleep(300);
        const {
          data: { data: pricePerformanceStats },
        } = await CoinMarketCapAPI.fetch({
          endpoint: CoinMarketCapAPI.cryptocurrency.pricePerformanceStats,
          params: {
            symbol: uniq(listSymbol).join(','),
            time_period: 'all_time,yesterday,24h,7d,30d,90d,365d',
          },
        });
        for (const symbol of Object.keys(pricePerformanceStats)) {
          for (const {
            id,
            name,
            slug,
            periods: {
              all_time: {
                quote: {
                  USD: {
                    percent_change: all_time_percent_change,
                    price_change: all_time_price_change,
                    open: all_time_open,
                    high: all_time_high,
                    low: all_time_low,
                    close: all_time_close,
                    open_timestamp: all_time_open_timestamp,
                    high_timestamp: all_time_high_timestamp,
                    low_timestamp: all_time_low_timestamp,
                    close_timestamp: all_time_close_timestamp,
                  },
                } = {
                  USD: {
                    percent_change: null,
                    price_change: null,
                    open: null,
                    high: null,
                    low: null,
                    close: null,
                    open_timestamp: null,
                    high_timestamp: null,
                    low_timestamp: null,
                    close_timestamp: null,
                  },
                },
              },
              yesterday: {
                quote: {
                  USD: {
                    percent_change: yesterday_percent_change,
                    price_change: yesterday_price_change,
                    open: yesterday_open,
                    high: yesterday_high,
                    low: yesterday_low,
                    close: yesterday_close,
                    open_timestamp: yesterday_open_timestamp,
                    high_timestamp: yesterday_high_timestamp,
                    low_timestamp: yesterday_low_timestamp,
                    close_timestamp: yesterday_close_timestamp,
                  },
                } = {
                  USD: {
                    percent_change: null,
                    price_change: null,
                    open: null,
                    high: null,
                    low: null,
                    close: null,
                    open_timestamp: null,
                    high_timestamp: null,
                    low_timestamp: null,
                    close_timestamp: null,
                  },
                },
              },
              '7d': {
                quote: {
                  USD: {
                    percent_change: _7d_percent_change,
                    price_change: _7d_price_change,
                    open: _7d_open,
                    high: _7d_high,
                    low: _7d_low,
                    close: _7d_close,
                    open_timestamp: _7d_open_timestamp,
                    high_timestamp: _7d_high_timestamp,
                    low_timestamp: _7d_low_timestamp,
                    close_timestamp: _7d_close_timestamp,
                  },
                } = {
                  USD: {
                    percent_change: null,
                    price_change: null,
                    open: null,
                    high: null,
                    low: null,
                    close: null,
                    open_timestamp: null,
                    high_timestamp: null,
                    low_timestamp: null,
                    close_timestamp: null,
                  },
                },
              },
              '24h': {
                quote: {
                  USD: {
                    percent_change: _24h_percent_change,
                    price_change: _24h_price_change,
                    open: _24h_open,
                    high: _24h_high,
                    low: _24h_low,
                    close: _24h_close,
                    open_timestamp: _24h_open_timestamp,
                    high_timestamp: _24h_high_timestamp,
                    low_timestamp: _24h_low_timestamp,
                    close_timestamp: _24h_close_timestamp,
                  },
                } = {
                  USD: {
                    percent_change: null,
                    price_change: null,
                    open: null,
                    high: null,
                    low: null,
                    close: null,
                    open_timestamp: null,
                    high_timestamp: null,
                    low_timestamp: null,
                    close_timestamp: null,
                  },
                },
              },
              '30d': {
                quote: {
                  USD: {
                    percent_change: _30d_percent_change,
                    price_change: _30d_price_change,
                    open: _30d_open,
                    high: _30d_high,
                    low: _30d_low,
                    close: _30d_close,
                    open_timestamp: _30d_open_timestamp,
                    high_timestamp: _30d_high_timestamp,
                    low_timestamp: _30d_low_timestamp,
                    close_timestamp: _30d_close_timestamp,
                  },
                } = {
                  USD: {
                    percent_change: null,
                    price_change: null,
                    open: null,
                    high: null,
                    low: null,
                    close: null,
                    open_timestamp: null,
                    high_timestamp: null,
                    low_timestamp: null,
                    close_timestamp: null,
                  },
                },
              },
              '90d': {
                quote: {
                  USD: {
                    percent_change: _90d_percent_change,
                    price_change: _90d_price_change,
                    open: _90d_open,
                    high: _90d_high,
                    low: _90d_low,
                    close: _90d_close,
                    open_timestamp: _90d_open_timestamp,
                    high_timestamp: _90d_high_timestamp,
                    low_timestamp: _90d_low_timestamp,
                    close_timestamp: _90d_close_timestamp,
                  },
                } = {
                  USD: {
                    percent_change: null,
                    price_change: null,
                    open: null,
                    high: null,
                    low: null,
                    close: null,
                    open_timestamp: null,
                    high_timestamp: null,
                    low_timestamp: null,
                    close_timestamp: null,
                  },
                },
              },
              '365d': {
                quote: {
                  USD: {
                    percent_change: _365d_percent_change,
                    price_change: _365d_price_change,
                    open: _365d_open,
                    high: _365d_high,
                    low: _365d_low,
                    close: _365d_close,
                    open_timestamp: _365d_open_timestamp,
                    high_timestamp: _365d_high_timestamp,
                    low_timestamp: _365d_low_timestamp,
                    close_timestamp: _365d_close_timestamp,
                  },
                } = {
                  USD: {
                    percent_change: null,
                    price_change: null,
                    open: null,
                    high: null,
                    low: null,
                    close: null,
                    open_timestamp: null,
                    high_timestamp: null,
                    low_timestamp: null,
                    close_timestamp: null,
                  },
                },
              },
            },
          } of pricePerformanceStats[symbol]) {
            this.logger.debug('info', 'pricePerformanceStats', { symbol, name });
            const marketData = omitBy(
              {
                'market_data.USD.all_time.percent_change': all_time_percent_change,
                'market_data.USD.all_time.price_change': all_time_price_change,
                'market_data.USD.all_time.open': all_time_open,
                'market_data.USD.all_time.high': all_time_high,
                'market_data.USD.all_time.low': all_time_low,
                'market_data.USD.all_time.close': all_time_close,
                'market_data.USD.all_time.open_timestamp': all_time_open_timestamp,
                'market_data.USD.all_time.high_timestamp': all_time_high_timestamp,
                'market_data.USD.all_time.low_timestamp': all_time_low_timestamp,
                'market_data.USD.all_time.close_timestamp': all_time_close_timestamp,

                'market_data.USD.yesterday.percent_change': yesterday_percent_change,
                'market_data.USD.yesterday.price_change': yesterday_price_change,
                'market_data.USD.yesterday.open': yesterday_open,
                'market_data.USD.yesterday.high': yesterday_high,
                'market_data.USD.yesterday.low': yesterday_low,
                'market_data.USD.yesterday.close': yesterday_close,
                'market_data.USD.yesterday.open_timestamp': yesterday_open_timestamp,
                'market_data.USD.yesterday.high_timestamp': yesterday_high_timestamp,
                'market_data.USD.yesterday.low_timestamp': yesterday_low_timestamp,
                'market_data.USD.yesterday.close_timestamp': yesterday_close_timestamp,

                'market_data.USD.24h.percent_change': _24h_percent_change,
                'market_data.USD.24h.price_change': _24h_price_change,
                'market_data.USD.24h.open': _24h_open,
                'market_data.USD.24h.high': _24h_high,
                'market_data.USD.24h.low': _24h_low,
                'market_data.USD.24h.close': _24h_close,
                'market_data.USD.24h.open_timestamp': _24h_open_timestamp,
                'market_data.USD.24h.high_timestamp': _24h_high_timestamp,
                'market_data.USD.24h.low_timestamp': _24h_low_timestamp,
                'market_data.USD.24h.close_timestamp': _24h_close_timestamp,

                'market_data.USD.7d.percent_change': _7d_percent_change,
                'market_data.USD.7d.price_change': _7d_price_change,
                'market_data.USD.7d.open': _7d_open,
                'market_data.USD.7d.high': _7d_high,
                'market_data.USD.7d.low': _7d_low,
                'market_data.USD.7d.close': _7d_close,
                'market_data.USD.7d.open_timestamp': _7d_open_timestamp,
                'market_data.USD.7d.high_timestamp': _7d_high_timestamp,
                'market_data.USD.7d.low_timestamp': _7d_low_timestamp,
                'market_data.USD.7d.close_timestamp': _7d_close_timestamp,

                'market_data.USD.30d.percent_change': _30d_percent_change,
                'market_data.USD.30d.price_change': _30d_price_change,
                'market_data.USD.30d.open': _30d_open,
                'market_data.USD.30d.high': _30d_high,
                'market_data.USD.30d.low': _30d_low,
                'market_data.USD.30d.close': _30d_close,
                'market_data.USD.30d.open_timestamp': _30d_open_timestamp,
                'market_data.USD.30d.high_timestamp': _30d_high_timestamp,
                'market_data.USD.30d.low_timestamp': _30d_low_timestamp,
                'market_data.USD.30d.close_timestamp': _30d_close_timestamp,

                'market_data.USD.90d.percent_change': _90d_percent_change,
                'market_data.USD.90d.price_change': _90d_price_change,
                'market_data.USD.90d.open': _90d_open,
                'market_data.USD.90d.high': _90d_high,
                'market_data.USD.90d.low': _90d_low,
                'market_data.USD.90d.close': _90d_close,
                'market_data.USD.90d.open_timestamp': _90d_open_timestamp,
                'market_data.USD.90d.high_timestamp': _90d_high_timestamp,
                'market_data.USD.90d.low_timestamp': _90d_low_timestamp,
                'market_data.USD.90d.close_timestamp': _90d_close_timestamp,

                'market_data.USD.365d.percent_change': _365d_percent_change,
                'market_data.USD.365d.price_change': _365d_price_change,
                'market_data.USD.365d.open': _365d_open,
                'market_data.USD.365d.high': _365d_high,
                'market_data.USD.365d.low': _365d_low,
                'market_data.USD.365d.close': _365d_close,
                'market_data.USD.365d.open_timestamp': _365d_open_timestamp,
                'market_data.USD.365d.high_timestamp': _365d_high_timestamp,
                'market_data.USD.365d.low_timestamp': _365d_low_timestamp,
                'market_data.USD.365d.close_timestamp': _365d_close_timestamp,
              },
              isNil,
            );
            const assetMarketData = omitBy(
              {
                percent_change_all_time: all_time_percent_change,
                percent_change_yesterday: yesterday_percent_change,
                percent_change_24h: _24h_percent_change,
                percent_change_7d: _7d_percent_change,
                percent_change_30d: _30d_percent_change,

                percent_change_90d: _90d_percent_change,
                percent_change_365d: _365d_percent_change,
              },
              isNil,
            );
            const {
              lastErrorObject: { updatedExisting: updatedAssetExisting },
            } = await this.model._collection.findOneAndUpdate(
              {
                $or: [
                  { name: { $regex: `^${name}$`, $options: 'i' } },
                  { name },
                  {
                    slug: {
                      $regex: `^${slugify(name, { trim: true, lower: true, remove: RemoveSlugPattern })}$`,
                      $options: 'i',
                    },
                  },
                ],
              },
              {
                $set: {
                  ...assetMarketData,
                  'id_of_sources.CoinMarketCap': String(id),
                  updated_at: new Date(),
                  updated_by: 'system',
                },
              },
            );
            const {
              lastErrorObject: { updatedAssetPriceExisting },
            } = await this.assetPriceModel._collection.findOneAndUpdate(
              {
                $or: [
                  { name: { $regex: `^${name}$`, $options: 'i' } },
                  {
                    slug: {
                      $regex: `^${slug}$`,
                      $options: 'i',
                    },
                  },
                  { name },
                  { slug },
                ],
              },
              {
                $set: {
                  ...marketData,
                  'id_of_sources.CoinMarketCap': String(id),
                  updated_at: new Date(),
                  updated_by: 'system',
                },
              },
              {
                upsert: false,
              },
            );
            if (!updatedAssetExisting) {
              await this.model._collection.findOneAndUpdate(
                {
                  $or: [
                    { name: { $regex: `^${name}$`, $options: 'i' } },
                    {
                      slug: {
                        $regex: `^${slug}$`,
                        $options: 'i',
                      },
                    },
                    { name },
                    { slug },
                  ],
                },
                {
                  $setOnInsert: {
                    ...assetMarketData,
                    name,
                    symbol: symbol,
                    slug,
                    trans: [] as any,
                    deleted: false,
                    created_at: new Date(),
                    updated_at: new Date(),
                    created_by: 'system',
                    categories: [],
                    'id_of_sources.CoinMarketCap': String(id),
                  },
                },
                {
                  upsert: true,
                },
              );
            }
            if (!updatedAssetPriceExisting) {
              await this.assetPriceModel._collection.findOneAndUpdate(
                {
                  $or: [
                    { name: { $regex: `^${name}$`, $options: 'i' } },
                    {
                      slug: {
                        $regex: `^${slug}$`,
                        $options: 'i',
                      },
                    },
                    { name },
                    { slug },
                  ],
                },
                {
                  $setOnInsert: {
                    name,
                    symbol: symbol,
                    slug: slugify(name, {
                      trim: true,
                      lower: true,
                      remove: RemoveSlugPattern,
                    }),
                    ...marketData,
                    deleted: false,
                    created_at: new Date(),
                    updated_at: new Date(),
                    created_by: 'system',
                    'id_of_sources.CoinMarketCap': String(id),
                  },
                },
                {
                  upsert: true,
                },
              );
            }
          }
        }
      }
      this.logger.debug('success', 'asset:fetchPricePerformanceStats:success');
    } catch (error) {
      this.logger.discord('job_error', 'asset:fetchPricePerformanceStats', JSON.stringify(error));
    }
  }
  async fetchMetadata() {
    try {
      const coinmarketcapAssets = await this.model
        .get([
          {
            $match: {
              'id_of_sources.CoinMarketCap': { $exists: true },
            },
          },
          {
            $sort: {
              market_cap: -1,
            },
          },
          {
            $project: {
              id_of_sources: 1,
            },
          },
        ])
        .toArray();
      for (const {
        _id,
        id_of_sources: { CoinMarketCap },
      } of coinmarketcapAssets) {
        await sleep(2500);
        const {
          data: {
            data: {
              [CoinMarketCap]: {
                contract_address,
                name,
                urls: {
                  website = [],
                  twitter = [],
                  message_board = [],
                  chat = [],
                  facebook = [],
                  explorer = [],
                  reddit = [],
                  technical_doc = [],
                  source_code = [],
                  announcement = [],
                },
                tags = [],
                platform,
              },
            },
          },
        } = await CoinMarketCapAPI.fetch({
          endpoint: `${CoinMarketCapAPI.cryptocurrency.metaData}`,
          params: {
            id: CoinMarketCap,
          },
        });
        await this.model._collection.findOneAndUpdate(
          {
            _id,
          },
          {
            $set: {
              contract_address,
            },
            $addToSet: {
              'urls.website': { $each: website || [] },
              'urls.twitter': { $each: twitter || [] },
              'urls.message_board': { $each: message_board || [] },
              'urls.chat': { $each: chat || [] },
              'urls.facebook': { $each: facebook || [] },
              'urls.explorer': { $each: explorer || [] },
              'urls.reddit': { $each: reddit || [] },
              'urls.technical_doc': { $each: technical_doc || [] },
              'urls.source_code': { $each: source_code || [] },
              'urls.announcement': { $each: announcement || [] },
              categories: { $each: tags || [] },
              ...(platform && {
                platform,
              }),
            } as any,
          },
        );
        // this.logger.debug('success', name);
      }
      this.logger.debug('success', 'asset:fetchMetadata:done');
    } catch (error) {
      this.logger.error('job_error', 'asset:fetchMetadata', JSON.stringify(error));
    }
  }
  /**
   * Initialize Worker listeners
   * @private
   */
  private initWorkerListeners(worker: Worker) {
    // Completed
    worker.on('completed', ({ id, name, data }: Job<AssetJobData>) => {
      this.logger.discord('success', '[job:asset:completed]', id, name, JSON.stringify(data));
    });
    // Failed
    worker.on('failed', ({ id, name, data, failedReason }: Job<AssetJobData>, error: Error) => {
      this.logger.discord(
        'error',
        '[job:asset:error]',
        id,
        name,
        failedReason,
        JSON.stringify(data),
        JSON.stringify(error),
      );
    });
  }
  /**
   * @description add job to queue
   */
  addJob({
    name,
    payload = {},
    options = {
      repeat: {
        every: +CoinMarketCapAPI.cryptocurrency.INTERVAL,
      },
    },
  }: {
    name: AssetJobNames;
    payload?: any;
    options?: JobsOptions;
  }) {
    this.queue
      .add(name, payload, options)
      .then((job) => this.logger.debug(`success`, `[addJob:success]`, { id: job.id, name, payload }))
      .catch((err) =>
        this.logger.discord('error', `[addJob:error]`, name, JSON.stringify(err), JSON.stringify(payload)),
      );
  }
  workerProcessor({ name, data }: Job<AssetJobData>): Promise<void> {
    this.logger.discord('info', `[workerProcessor:run]`, name);
    return this.jobs[name as keyof typeof this.jobs]?.call(this, data) || this.jobs.default();
  }
}
