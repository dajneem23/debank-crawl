import Container, { Service, Token } from 'typedi';
import Logger from '@/core/logger';
import { sleep, throwErr, toOutPut, toPagingOutput } from '@/utils/common';
import { alphabetSize12 } from '@/utils/randomString';
import { $toObjectId, $pagination, $toMongoFilter, $keysToProject } from '@/utils/mongoDB';
import { AssetError, assetErrors, AssetModel, assetModelToken } from '.';
import { BaseServiceInput, BaseServiceOutput, assetSortBy, PRIVATE_KEYS, RemoveSlugPattern } from '@/types/Common';
import { chunk, isNil, omit } from 'lodash';
import { _asset } from '@/modules';
import { env } from 'process';
import slugify from 'slugify';
import { FETCH_MARKET_DATA_DURATION, PRICE_STACK_SIZE } from './asset.constants';
import { Job, JobsOptions, Queue, QueueEvents, QueueScheduler, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { SystemError } from '@/core/errors';
import { AssetJobData, AssetJobNames } from './asset.job';
import { CoinMarketCapAPI } from '@/common/api';
import { DIRedisConnection } from '@/loaders/redisClientLoader';
const TOKEN_NAME = '_assetService';
/**
 * A bridge allows another service access to the Model layer
 * @export assetServiceToken
 * @class AssetService
 * @extends {BaseService}
 */
export const assetServiceToken = new Token<AssetService>(TOKEN_NAME);

/**
 * @class AssetService
 * @extends  BaseService
 * @description Asset Service for all asset related operations
 */
@Service(assetServiceToken)
export class AssetService {
  private logger = new Logger('AssetService');

  private model = Container.get<AssetModel>(assetModelToken);

  private readonly redisConnection: IORedis.Redis = Container.get(DIRedisConnection);

  private worker: Worker;

  private queue: Queue;

  private queueScheduler: QueueScheduler;

  private readonly jobs = {
    'asset:fetch:marketData': this.fetchMarketData,
    'asset:fetch:pricePerformanceStats': this.fetchPricePerformanceStats,
    'asset:fetch:ohlcv': this.fetchOHLCV,
    default: () => {
      throw new SystemError('Invalid job name');
    },
  };

  constructor() {
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
      lockDuration: 1000 * 60 * 5,
      concurrency: 20,
      limiter: {
        max: 1,
        duration: FETCH_MARKET_DATA_DURATION,
      },
    });
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
        attempts: 5,
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

    queueEvents.on('completed', ({ jobId }) => {
      this.logger.debug('success', 'Job completed', { jobId });
    });

    queueEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      this.logger.debug('error', 'Job failed', { jobId, failedReason });
    });
  }

  private addFetchingDataJob() {
    this.addJob({
      name: 'asset:fetch:marketData',
      payload: {},
      options: {
        repeat: {
          every: +CoinMarketCapAPI.cryptocurrency.INTERVAL,
        },
        jobId: 'asset:fetch:marketData',
      },
    });
    this.addJob({
      name: 'asset:fetch:pricePerformanceStats',
      payload: {},
      options: {
        repeat: {
          pattern: CoinMarketCapAPI.cryptocurrency.pricePerformanceStatsRepeatPattern,
        },
        jobId: 'asset:fetch:pricePerformanceStats',
      },
    });
  }

  private error(msg: keyof typeof assetErrors) {
    return new AssetError(msg);
  }

  get outputKeys() {
    return this.model._keys;
  }
  get publicOutputKeys() {
    return ['id', 'name', 'token_id', 'about', 'categories', 'avatar', 'slug', 'market_data'];
  }
  get transKeys() {
    return ['about', 'features', 'services'];
  }
  /**
   * Generate ID
   */
  static async generateID() {
    return alphabetSize12();
  }
  /**
   * Create a new category
   * @param _content
   * @param _subject
   * @returns {Promise<BaseServiceOutput>}
   */
  async create({ _content, _subject }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { name } = _content;
      const value = await this.model.create(
        {
          name,
        },
        {
          ..._asset,
          ..._content,
          deleted: false,
          ...(_subject && { created_by: _subject }),
        },
      );
      this.logger.debug('create_success', { _content });
      return toOutPut({ item: value, keys: this.outputKeys });
    } catch (err) {
      this.logger.error('create_error', err.message);
      throw err;
    }
  }

  /**
   * Update category
   * @param _id
   * @param _content
   * @param _subject
   * @returns {Promise<Asset>}
   */
  async update({ _id, _content, _subject }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      await this.model.update($toMongoFilter({ _id }), {
        $set: {
          ..._content,
          ...(_subject && { updated_by: _subject }),
        },
      });
      this.logger.debug('update_success', { _content });
      return toOutPut({ item: _content, keys: this.outputKeys });
    } catch (err) {
      this.logger.error('update_error', err.message);
      throw err;
    }
  }

  /**
   * Delete category
   * @param _id
   * @param {ObjectId} _subject
   * @returns {Promise<void>}
   */
  async delete({ _id, _subject }: BaseServiceInput): Promise<void> {
    try {
      await this.model.delete($toMongoFilter({ _id }), {
        ...(_subject && { deleted_by: _subject }),
      });
      this.logger.debug('delete_success', { _id });
      return;
    } catch (err) {
      this.logger.error('delete_error', err.message);
      throw err;
    }
  }

  /**
   *  Query category
   * @param {any} _filter
   * @param {BaseQuery} _query
   * @returns {Promise<BaseServiceOutput>}
   *
   **/
  async query({ _filter, _query, _permission = 'public' }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const {
        lang,
        categories = [],
        community_vote_min,
        community_vote_max,
        market_cap_min,
        market_cap_max,
        fully_diluted_market_cap_min,
        fully_diluted_market_cap_max,
        backer,
        development_status,
        founded_from,
        founded_to,
        deleted = false,
      } = _filter;
      const { offset = 1, limit, sort_by: _sort_by, sort_order, keyword } = _query;
      const sort_by = assetSortBy[_sort_by as keyof typeof assetSortBy] || assetSortBy['created_at'];
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model
        .get(
          $pagination({
            $match: {
              $and: [
                {
                  ...((_permission === 'private' && {
                    deleted,
                  }) || {
                    deleted: false,
                  }),
                  ...(lang && {
                    'trans.lang': { $eq: lang },
                  }),
                },
              ],
              ...(keyword && {
                $or: [
                  { name: { $regex: keyword, $options: 'i' } },
                  { token_id: { $regex: keyword, $options: 'i' } },
                  { unique_key: { $regex: keyword, $options: 'i' } },
                ],
              }),
              ...(categories.length && {
                $or: [
                  {
                    categories: { $in: $toObjectId(categories) },
                  },
                ],
              }),

              ...(!isNil(community_vote_max) && {
                community_vote: {
                  $lte: community_vote_max,
                },
              }),
              ...(!isNil(community_vote_min) && {
                community_vote: {
                  $gte: community_vote_min,
                },
              }),

              ...(!isNil(market_cap_min) && {
                'market_data.USD.market_cap': {
                  $gte: market_cap_min,
                },
              }),
              ...(!isNil(market_cap_max) && {
                'market_data.USD.market_cap': {
                  $lte: market_cap_max,
                },
              }),

              ...(!isNil(founded_from) && {
                founded: {
                  $gte: founded_from,
                },
              }),
              ...(!isNil(founded_to) && {
                founded: {
                  $lte: founded_to,
                },
              }),

              ...(!isNil(fully_diluted_market_cap_max) && {
                'market_data.USD.fully_diluted_market_cap': {
                  $lte: fully_diluted_market_cap_max,
                },
              }),
              ...(!isNil(fully_diluted_market_cap_min) && {
                'market_data.USD.fully_diluted_market_cap': {
                  $gte: fully_diluted_market_cap_min,
                },
              }),
              ...(backer && {
                backer: { $eq: backer },
              }),
              ...(development_status && {
                'technologies.development_status': { $eq: development_status },
              }),
            },
            $addFields: this.model.$addFields.categories,
            $lookups: [this.model.$lookups.categories],
            $projects: [
              ...((lang && [
                {
                  $project: {
                    ...$keysToProject(this.outputKeys),
                    trans: {
                      $filter: {
                        input: '$trans',
                        as: 'trans',
                        cond: {
                          $eq: ['$$trans.lang', lang],
                        },
                      },
                    },
                  },
                },
              ]) ||
                []),
            ],
            $more: [
              ...((lang && [this.model.$sets.trans]) || []),
              ...((lang && [
                {
                  $project: {
                    ...$keysToProject(this.outputKeys),
                    ...(lang && $keysToProject(this.transKeys, '$trans')),
                  },
                },
              ]) ||
                []),
            ],
            ...(sort_by && sort_order && { $sort: { [sort_by]: sort_order == 'asc' ? 1 : -1 } }),
            ...(limit && offset && { items: [{ $skip: +offset * (+offset - 1) }, { $limit: +limit }] }),
          }),
        )
        .toArray();
      this.logger.debug('query_success', { total_count, items });
      return toPagingOutput({
        items,
        total_count,
        has_next: total_count > offset * limit,
        keys: _permission == 'private' ? this.outputKeys : this.publicOutputKeys,
      });
    } catch (err) {
      this.logger.error('query_error', err.message);
      throw err;
    }
  }
  /**
   * Get by ID
   * @param _id - Event ID
   * @param _filter - Filter
   * @returns { Promise<BaseServiceOutput> } - Event
   */
  async getById({ _id, _filter, _permission = 'public' }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { lang } = _filter;
      const [item] = await this.model
        .get([
          {
            $match: {
              ...$toMongoFilter({
                _id,
              }),
              ...(lang && {
                'trans.lang': { $eq: lang },
              }),
            },
          },
          {
            $addFields: this.model.$addFields.categories,
          },
          this.model.$lookups.categories,
          this.model.$lookups.author,
          this.model.$sets.author,
          ...((lang && [
            {
              $project: {
                ...$keysToProject(this.outputKeys),
                trans: {
                  $filter: {
                    input: '$trans',
                    as: 'trans',
                    cond: {
                      $eq: ['$$trans.lang', lang],
                    },
                  },
                },
              },
            },
          ]) ||
            []),
          ...((lang && [this.model.$sets.trans]) || []),
          ...((lang && [
            {
              $project: {
                ...$keysToProject(this.outputKeys),
                ...(lang && $keysToProject(this.transKeys, '$trans')),
              },
            },
          ]) ||
            []),
          {
            $limit: 1,
          },
        ])
        .toArray();
      if (isNil(item)) throwErr(this.error('NOT_FOUND'));
      this.logger.debug('get_success', { item });
      return _permission == 'private' ? toOutPut({ item }) : omit(toOutPut({ item }), PRIVATE_KEYS);
    } catch (err) {
      this.logger.error('get_error', err.message);
      throw err;
    }
  }
  /**
   * Get by name
   * @param _id - Event ID
   * @param _filter - Filter
   * @returns { Promise<BaseServiceOutput> } - Event
   */
  async getBySlug({ _slug, _filter, _permission = 'public' }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { lang } = _filter;
      const [item] = await this.model
        .get([
          {
            $match: {
              ...$toMongoFilter({ slug: _slug }),
              ...(lang && {
                'trans.lang': { $eq: lang },
              }),
            },
          },
          {
            $addFields: this.model.$addFields.categories,
          },
          this.model.$lookups.categories,
          this.model.$lookups.author,
          this.model.$sets.author,
          ...((lang && [
            {
              $project: {
                ...$keysToProject(this.outputKeys),
                trans: {
                  $filter: {
                    input: '$trans',
                    as: 'trans',
                    cond: {
                      $eq: ['$$trans.lang', lang],
                    },
                  },
                },
              },
            },
          ]) ||
            []),
          ...((lang && [this.model.$sets.trans]) || []),
          ...((lang && [
            {
              $project: {
                ...$keysToProject(this.outputKeys),
                ...(lang && $keysToProject(this.transKeys, '$trans')),
              },
            },
          ]) ||
            []),
          {
            $limit: 1,
          },
        ])
        .toArray();
      if (isNil(item)) throwErr(this.error('NOT_FOUND'));
      this.logger.debug('get_success', { item });
      return _permission == 'private' ? toOutPut({ item }) : omit(toOutPut({ item }), PRIVATE_KEYS);
    } catch (err) {
      this.logger.error('get_error', err.message);
      throw err;
    }
  }
  /**
   * Search by text index
   * @param {BaseServiceInput} _filter _query
   * @returns
   */
  async search({ _filter, _query, _permission = 'public' }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { lang } = _filter;
      const { offset = 1, limit = 10, sort_by, sort_order, keyword } = _query;
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model
        .get([
          ...$pagination({
            $match: {
              $and: [
                {
                  deleted: false,
                  ...(lang && {
                    'trans.lang': { $eq: lang },
                  }),
                },
              ],
              ...(keyword && {
                $or: [{ $text: { $search: keyword } }, { name: { $regex: keyword, $options: 'i' } }],
              }),
            },
            $addFields: this.model.$addFields.categories,
            $lookups: [this.model.$lookups.categories],
            $projects: [
              ...((lang && [
                {
                  $project: {
                    ...$keysToProject(this.outputKeys),
                    trans: {
                      $filter: {
                        input: '$trans',
                        as: 'trans',
                        cond: {
                          $eq: ['$$trans.lang', lang],
                        },
                      },
                    },
                  },
                },
              ]) ||
                []),
            ],
            $more: [
              ...((lang && [this.model.$sets.trans]) || []),
              ...((lang && [
                {
                  $project: {
                    ...$keysToProject(this.outputKeys),
                    ...(lang && $keysToProject(this.transKeys, '$trans')),
                  },
                },
              ]) ||
                []),
            ],
            ...(limit && offset && { items: [{ $skip: +limit * (+offset - 1) }, { $limit: +limit }] }),
          }),
        ])
        .toArray();
      this.logger.debug('query_success', { total_count, items });
      return toPagingOutput({
        items,
        total_count,
        has_next: total_count > offset * limit,
        keys: _permission == 'private' ? this.outputKeys : this.publicOutputKeys,
      });
    } catch (err) {
      this.logger.error('query_error', err.message);
      throw err;
    }
  }
  /**
   *
   * @description fetch market data from assetmarketcap api
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
      this.logger.debug('success', 'fetchMarketData', { page, per_page });
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model
        .get([
          ...$pagination({
            $projects: [
              {
                $project: {
                  token_id: 1,
                },
              },
            ],
            ...(per_page && page && { items: [{ $skip: +per_page * (+page - 1) }, { $limit: +per_page }] }),
          }),
        ])
        .toArray();
      if (items.length) {
        const listSymbol = items.map((item) => item.token_id);
        const {
          data: { data: quotesLatest },
        } = await CoinMarketCapAPI.fetchCoinMarketCapAPI({
          endpoint: CoinMarketCapAPI.cryptocurrency.quotesLatest,
          params: {
            symbol: listSymbol.join(','),
            aux: 'num_market_pairs,cmc_rank,date_added,tags,platform,max_supply,circulating_supply,total_supply,market_cap_by_total_supply,volume_24h_reported,volume_7d,volume_7d_reported,volume_30d,volume_30d_reported,is_active,is_fiat',
          },
        });
        for (const symbol of Object.keys(quotesLatest)) {
          for (const item of quotesLatest[symbol]) {
            const {
              circulating_supply = 0,
              total_supply = 0,
              max_supply = 0,
              num_market_pairs = 0,
              tvl_ratio = 0,
              self_reported_circulating_supply = 0,
              self_reported_market_cap = 0,
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
            } = item;
            const marketData = {
              cmc_rank,
              'market_data.circulating_supply': circulating_supply,
              'market_data.total_supply': total_supply,
              'market_data.max_supply': max_supply,
              'market_data.num_market_pairs': num_market_pairs,
              'market_data.tvl_ratio': tvl_ratio,
              'market_data.self_reported_circulating_supply': self_reported_circulating_supply,
              'market_data.self_reported_market_cap': self_reported_market_cap,
              'market_data.USD.price': price,
              'market_data.USD.24h.volume': volume_24h,
              'market_data.USD.24h.volume_change': volume_change_24h,
              'market_data.USD.1h.percent_change': percent_change_1h,
              'market_data.USD.24h.percent_change': percent_change_24h,
              'market_data.USD.7d.percent_change': percent_change_7d,
              'market_data.USD.30d.percent_change': percent_change_30d,
              'market_data.USD.60d.percent_change': percent_change_60d,
              'market_data.USD.90d.percent_change': percent_change_90d,
              'market_data.USD.market_cap': market_cap,
              'market_data.USD.market_cap_dominance': market_cap_dominance,
              'market_data.USD.fully_diluted_market_cap': fully_diluted_market_cap,
              'market_data.USD.tvl': tvl,
              'market_data.USD.last_updated': last_updated,
              'market_data.USD.24h.volume_reported': volume_24h_reported,
              'market_data.USD.7d.volume_reported': volume_7d_reported,
              'market_data.USD.30d.volume_reported': volume_30d_reported,
              'market_data.USD.market_cap_by_total_supply': market_cap_by_total_supply,
            };
            const {
              value,
              ok,
              lastErrorObject: { updatedExisting },
            } = await this.model._collection.findOneAndUpdate(
              {
                $or: [
                  { name: { $regex: `^${name}$`, $options: 'i' } },
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
                  ...marketData,
                  updated_at: new Date(),
                  updated_by: 'system',
                },
                $push: {
                  'market_data.USD.list_price': {
                    $each: [
                      {
                        value: marketData['market_data.USD.price'],
                        timestamp: new Date(),
                      },
                    ],
                    $position: 0,
                    $slice: PRICE_STACK_SIZE,
                  },
                } as any,
              },
              {
                upsert: false,
              },
            );
            if (!updatedExisting) {
              await this.model._collection.findOneAndUpdate(
                {
                  name,
                },
                {
                  $setOnInsert: {
                    name,
                    'market_data.USD.list_price': [
                      {
                        value: marketData['market_data.USD.price'],
                        timestamp: new Date(),
                      },
                    ],
                    token_id: symbol,
                    ...marketData,
                    slug: slugify(name, {
                      trim: true,
                      lower: true,
                      remove: RemoveSlugPattern,
                    }),
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
          }
        }
        this.logger.debug('success', { items: items.length, total_count });
        await this.fetchMarketData({
          page: page + 1,
          per_page,
        });
      } else {
        this.logger.debug('success', { total_count });
      }
    } catch (err) {
      this.logger.debug('error', 'fetchMarketData', err.message);
      throw err;
    }
  }
  /**
   *
   * @description fetch OHLCV from assetmarketcap api
   */
  async fetchOHLCV({
    page = 1,
    per_page = CoinMarketCapAPI.cryptocurrency.LIMIT,
    delay = 300,
  }: {
    page?: number;
    per_page?: number;
    delay?: number;
  }): Promise<void> {
    await sleep(delay);
    try {
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model
        .get([
          ...$pagination({
            $projects: [
              {
                $project: {
                  token_id: 1,
                },
              },
            ],
            ...(per_page && page && { items: [{ $skip: +per_page * (+page - 1) }, { $limit: +per_page }] }),
          }),
        ])
        .toArray();
      if (items.length) {
        const listSymbol = items.map((item) => item.token_id);
        const {
          data: { data: ohlcvLastest },
        } = await CoinMarketCapAPI.fetchCoinMarketCapAPI({
          endpoint: CoinMarketCapAPI.cryptocurrency.ohlcvLastest,
          params: {
            symbol: listSymbol.join(','),
          },
        });
        for (const symbol of Object.keys(ohlcvLastest)) {
          this.logger.debug('success', { symbol });

          for (const item of ohlcvLastest[symbol]) {
            const {
              quote: {
                USD: { open, high, low, close, volume },
              },
              name,
            } = item;
            this.logger.debug('success', { name });
            const {
              value,
              ok,
              lastErrorObject: { updatedExisting },
            } = await this.model._collection.findOneAndUpdate(
              {
                $or: [
                  { name: { $regex: `^${name}$`, $options: 'i' } },
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
                  'market_data.USD.open': open,
                  'market_data.USD.high': high,
                  'market_data.USD.low': low,
                  'market_data.USD.close': close,
                  'market_data.USD.volume': volume,
                  updated_at: new Date(),
                  updated_by: 'system',
                },
              },
              {
                upsert: false,
              },
            );
            if (!updatedExisting) {
              await this.model._collection.findOneAndUpdate(
                {
                  name: { $regex: `^${name}$`, $options: 'i' },
                },
                {
                  $setOnInsert: {
                    name,
                    slug: slugify(name, {
                      trim: true,
                      lower: true,
                      remove: RemoveSlugPattern,
                    }),
                    'market_data.USD.open': open,
                    'market_data.USD.high': high,
                    'market_data.USD.low': low,
                    'market_data.USD.close': close,
                    'market_data.USD.volume': volume,
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
          }
        }
        await this.fetchOHLCV({
          page: page + 1,
          per_page,
        });
      } else {
        this.logger.debug('success', { total_count });
        return;
      }
    } catch (err) {
      this.logger.debug('error', 'fetchMarketData', err.message);
      throw err;
    }
  }

  async fetchPricePerformanceStats() {
    this.logger.debug('info', 'fetchPricePerformanceStats start');
    const allAssets = await this.model.get().toArray();
    const groupAssets = chunk(allAssets, CoinMarketCapAPI.cryptocurrency.pricePerformanceStatsLimit);
    for (const assets of groupAssets) {
      const listSymbol = assets.map((asset) => asset.token_id);
      const {
        data: { data: pricePerformanceStats },
      } = await CoinMarketCapAPI.fetchCoinMarketCapAPI({
        endpoint: CoinMarketCapAPI.cryptocurrency.pricePerformanceStats,
        params: {
          symbol: listSymbol.join(','),
          time_period: 'all_time,yesterday,24h,7d,30d,90d,365d',
        },
      });
      for (const symbol of Object.keys(pricePerformanceStats)) {
        for (const {
          name,
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
                  percent_change: 0,
                  price_change: 0,
                  open: 0,
                  high: 0,
                  low: 0,
                  close: 0,
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
                  percent_change: 0,
                  price_change: 0,
                  open: 0,
                  high: 0,
                  low: 0,
                  close: 0,
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
                  percent_change: 0,
                  price_change: 0,
                  open: 0,
                  high: 0,
                  low: 0,
                  close: 0,
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
                  percent_change: 0,
                  price_change: 0,
                  open: 0,
                  high: 0,
                  low: 0,
                  close: 0,
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
                  percent_change: 0,
                  price_change: 0,
                  open: 0,
                  high: 0,
                  low: 0,
                  close: 0,
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
                  percent_change: 0,
                  price_change: 0,
                  open: 0,
                  high: 0,
                  low: 0,
                  close: 0,
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
                  percent_change: 0,
                  price_change: 0,
                  open: 0,
                  high: 0,
                  low: 0,
                  close: 0,
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
          const marketData = {
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
          };
          const {
            lastErrorObject: { updatedExisting },
          } = await this.model._collection.findOneAndUpdate(
            {
              $or: [
                { name: { $regex: `^${name}$`, $options: 'i' } },
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
                ...marketData,
                updated_at: new Date(),
                updated_by: 'system',
              },
            },
            {
              upsert: false,
            },
          );
          if (!updatedExisting) {
            await this.model._collection.findOneAndUpdate(
              {
                name,
              },
              {
                $setOnInsert: {
                  ...marketData,
                  name,
                  token_id: symbol,
                  slug: slugify(name, {
                    trim: true,
                    lower: true,
                    remove: RemoveSlugPattern,
                  }),
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
        }
      }
    }
    this.logger.debug('success', 'fetchPricePerformanceStats done');
  }
  /**
   * Initialize Worker listeners
   * @private
   */
  private initWorkerListeners(worker: Worker) {
    // Completed
    worker.on('completed', (job: Job<AssetJobData>) => {
      this.logger.debug('success', '[job:asset:completed]', { id: job.id, jobName: job.name, data: job.data });
    });
    // Failed
    worker.on('failed', (job: Job<AssetJobData>, error: Error) => {
      this.logger.error('error', '[job:asset:error]', { jobId: job.id, error, jobName: job.name, data: job.data });
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
      .then((job) => this.logger.debug(`success`, `[addJob:success]`, { id: job.id, payload }))
      .catch((err) => this.logger.error('error', `[addJob:error]`, err, payload));
  }
  workerProcessor(job: Job<AssetJobData>): Promise<void> {
    const { name } = job;
    this.logger.debug('info', `[workerProcessor]`, { name, data: job.data });
    return this.jobs[name as keyof typeof this.jobs]?.call(this, {}) || this.jobs.default();
  }
}
