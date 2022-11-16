import Container from 'typedi';
import Logger from '@/core/logger';
import { Job, JobsOptions, MetricsTime, Queue, QueueEvents, QueueScheduler, Worker } from 'bullmq';
import { env } from 'process';
import { DIRedisConnection } from '@/loaders/redisClientLoader';
import IORedis from 'ioredis';
import { CoinGeckoAPI } from '@/common/api';
import { CoinGeckoJobNames, fetchCoinGeckoDataJob } from './coingecko.job';
import {
  coinGeckoAssetModelToken,
  coinGeckoBlockchainModelToken,
  coinGeckoCategoriesModelToken,
  coinGeckoCryptoCurrencyGlobalModelToken,
  coinGeckoExchangeModelToken,
} from './coingecko.model';
import axios from 'axios';

/**
 * @class CoingeckoAsset
 * @extends BaseService
 * @description AssetTrending Service for all coingeckoAsset related operations
 */
export class CoinGeckoService {
  private logger = new Logger('CoinGecko');

  private coinGeckoAssetModel = Container.get(coinGeckoAssetModelToken);

  private coinGeckoCategoriesModel = Container.get(coinGeckoCategoriesModelToken);

  private coinGeckoBlockchainModel = Container.get(coinGeckoBlockchainModelToken);

  private coinGeckoExchangeModel = Container.get(coinGeckoExchangeModelToken);

  private coinGeckoCryptoCurrencyGlobalModel = Container.get(coinGeckoCryptoCurrencyGlobalModelToken);

  private readonly redisConnection: IORedis.Redis = Container.get(DIRedisConnection);

  private worker: Worker;

  private queue: Queue;

  private queueScheduler: QueueScheduler;

  private readonly jobs: {
    [key in CoinGeckoJobNames | 'default']?: (data?: any) => Promise<void>;
  } = {
    'coingecko:fetch:assets:list': this.fetchCoinGeckoAssetList,
    'coingecko:fetch:assets:details': this.fetchCoinGeckoAssetDetails,
    'coingecko:add:fetch:assets:details': this.addFetchCoinGeckoAssetDetails,
    'coingecko:fetch:categories:list': this.fetchCoinGeckoCategoriesList,
    'coingecko:fetch:blockchains:list': this.fetchCoinGeckoBlockchainsList,
    'coingecko:fetch:exchanges:list': this.fetchCoinGeckoBlockchainsList,
    'coingecko:fetch:exchanges:details': this.fetchCoinGeckoExchangeDetails,
    'coingecko:add:fetch:exchanges:details': this.addFetchCoinGeckoExchangeDetails,
    'coingecko:fetch:cryptocurrency:global': this.fetchCoinGeckoCryptoCurrencyGlobal,
    default: () => {
      throw new Error('Invalid job name');
    },
  };

  constructor() {
    // this.fetchCoinGeckoAssetDetails();
    //this.fetchCoinGeckoCryptoCurrencyGlobal();
    // this.fetchCoinGeckoAssetDetails({
    //   id: 'bitcoin',
    // });
    this.addFetchCoinGeckoExchangeDetails();
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
    this.worker = new Worker('coingecko', this.workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection as any,
      lockDuration: 1000 * 60,
      concurrency: 20,
      limiter: {
        max: 5,
        duration: 5 * 60 * 1000,
      },
      metrics: {
        maxDataPoints: MetricsTime.TWO_WEEKS,
      },
    });
    this.logger.debug('info', '[initWorker:coingecko]', 'Worker initialized');

    this.initWorkerListeners(this.worker);
  }
  /**
   *  @description init BullMQ Queue
   */
  private initQueue() {
    this.queue = new Queue('coingecko', {
      connection: this.redisConnection as any,
      defaultJobOptions: {
        // The total number of attempts to try the job until it completes
        attempts: 3,
        // Backoff setting for automatic retries if the job fails
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: true,
        removeOnFail: true,
      },
    });
    this.queueScheduler = new QueueScheduler('coingecko', {
      connection: this.redisConnection as any,
    });
    const queueEvents = new QueueEvents('coingecko', {
      connection: this.redisConnection as any,
    });

    this.initRepeatJobs();

    // queueEvents.on('completed', ({ jobId }) => {
    //   this.logger.debug('success', 'Job completed', { jobId });
    // });

    queueEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      this.logger.discord('error', 'coingecko:Job failed', jobId, failedReason);
    });
  }
  private initRepeatJobs() {
    this.addJob({
      name: 'coingecko:fetch:assets:list',
      payload: {},
      options: {
        repeatJobKey: 'coingecko:fetch:assets:list',
        repeat: {
          pattern: '0 0 * * SUN',
        },
        // jobId: 'coingecko:fetch:assets:list',
        removeOnFail: true,
        removeOnComplete: true,
      },
    });
    this.addJob({
      name: 'coingecko:add:fetch:assets:details',
      payload: {},
      options: {
        repeatJobKey: 'coingecko:add:fetch:assets:details',
        repeat: {
          pattern: '* 0 0 * * *',
        },
        // jobId: 'coingecko:fetch:assets:details',
        removeOnFail: true,
        removeOnComplete: true,
      },
    });
    this.addJob({
      name: 'coingecko:fetch:categories:list',
      payload: {},
      options: {
        repeatJobKey: 'coingecko:fetch:categories:list',
        repeat: {
          pattern: '0 0 * * SUN',
        },
        // jobId: 'coingecko:fetch:categories:list',
        removeOnFail: true,
        removeOnComplete: true,
      },
    });
    this.addJob({
      name: 'coingecko:fetch:blockchains:list',
      payload: {},
      options: {
        repeatJobKey: 'coingecko:fetch:blockchains:list',
        repeat: {
          pattern: '0 0 * * SUN',
        },
        // jobId: 'coingecko:fetch:blockchains:list',
        removeOnFail: true,
        removeOnComplete: true,
      },
    });
    this.addJob({
      name: 'coingecko:fetch:exchanges:list',
      payload: {},
      options: {
        repeatJobKey: 'coingecko:fetch:exchanges:list',
        repeat: {
          pattern: '0 0 * * SUN',
        },
        // jobId: 'coingecko:fetch:exchanges:list',
        removeOnFail: true,
        removeOnComplete: true,
      },
    });
    this.addJob({
      name: 'coingecko:add:fetch:exchanges:details',
      payload: {},
      options: {
        repeatJobKey: 'coingecko:add:fetch:exchanges:details',
        repeat: {
          pattern: '* 0 0 * * *',
        },
        // jobId: 'coingecko:fetch:exchanges:details',
        removeOnFail: true,
        removeOnComplete: true,
      },
    });
    this.addJob({
      name: 'coingecko:fetch:cryptocurrency:global',
      payload: {},
      options: {
        repeatJobKey: 'coingecko:fetch:cryptocurrency:global',
        repeat: {
          pattern: '* 0 0 * * *',
        },
        // jobId: 'coingecko:fetch:cryptocurrency:global',
        removeOnFail: true,
        removeOnComplete: true,
      },
    });
  }
  async fetchCoinGeckoAssetList() {
    try {
      const { data } = await CoinGeckoAPI.fetch({
        endpoint: CoinGeckoAPI.Coins.list.endpoint,
        params: CoinGeckoAPI.Coins.list.params,
      });
      this.logger.debug('info', 'fetchCoinGeckoAssetList', { num: data.length });
      for (const asset of data) {
        const { id, name, symbol, platforms } = asset;

        await this.coinGeckoAssetModel._collection.findOneAndUpdate(
          { id },
          {
            $set: {
              id,
              name,
              symbol,
              platforms,
              updated_at: new Date(),
              updated_by: 'system',
            },
            $setOnInsert: {
              created_at: new Date(),
              created_by: 'system',
            },
          },
          { upsert: true },
        );
      }
      this.logger.debug('success', 'coingecko:fetchCoinGeckoAssetList');
    } catch (error) {
      this.logger.discord('error', 'coingecko:fetchCoinGeckoAssetList', JSON.stringify(error));
      throw error;
    }
  }
  async addFetchCoinGeckoAssetDetails() {
    try {
      const assets = await this.coinGeckoAssetModel
        .get([
          {
            $project: {
              id: 1,
            },
          },
        ])
        .toArray();
      this.logger.debug('info', 'coingecko:fetchCoinGeckoAssetDetails', { num: assets.length });
      for (const { id } of assets) {
        this.addJob({
          name: 'coingecko:fetch:assets:details',
          payload: { id },
          options: {
            jobId: `coingecko:fetch:assets:details:${id}`,
            removeOnFail: true,
            removeOnComplete: true,
            delay: 1000 * 5,
          },
        });
      }
      this.logger.debug('success', 'coingecko:fetchCoinGeckoAssetDetails');
    } catch (error) {
      this.logger.discord('error', 'coingecko:fetchCoinGeckoAssetDetails', JSON.stringify(error));
      throw error;
    }
  }

  async fetchCoinGeckoAssetDetails({ id }: { id: string }) {
    try {
      if (!id) {
        throw new Error('coingecko:fetchCoinGeckoAssetDetails id is required');
      }
      const { data, status } = await CoinGeckoAPI.fetch({
        endpoint: `${CoinGeckoAPI.Coins.detail.endpoint}/${id}`,
        params: CoinGeckoAPI.Coins.detail.params,
      });
      const { id: _id, symbol, name, ...details } = data;
      await this.coinGeckoAssetModel._collection.findOneAndUpdate(
        { id },
        {
          $set: {
            details,
            updated_at: new Date(),
            updated_by: 'system',
          },
          $setOnInsert: {
            created_at: new Date(),
            created_by: 'system',
          },
        },
        { upsert: true },
      );
      this.logger.debug('success', 'coingecko:fetchCoinGeckoAssetDetails', { id });
    } catch (error) {
      this.logger.discord('error', 'coingecko:fetchCoinGeckoAssetDetails', JSON.stringify(error));
      throw error;
    }
  }
  async fetchCoinGeckoCategoriesList() {
    try {
      const { data } = await CoinGeckoAPI.fetch({
        endpoint: CoinGeckoAPI.Categories.listWithMarketData.endpoint,
        params: CoinGeckoAPI.Categories.listWithMarketData.params,
      });
      this.logger.debug('info', 'coingecko:fetchCoinGeckoCategoriesList', { num: data.length });
      for (const { id, ...rest } of data) {
        await this.coinGeckoCategoriesModel._collection.findOneAndUpdate(
          { id },
          {
            $set: {
              id,
              ...rest,
              updated_at: new Date(),
              updated_by: 'system',
            },
            $setOnInsert: {
              created_at: new Date(),
              created_by: 'system',
            },
          },
          { upsert: true },
        );
      }
      this.logger.debug('success', 'coingecko:fetchCoinGeckoCategoriesList');
    } catch (error) {
      this.logger.discord('error', 'coingecko:fetchCoinGeckoCategoriesList', JSON.stringify(error));
      throw error;
    }
  }
  async fetchCoinGeckoBlockchainsList() {
    try {
      const { data, status } = await CoinGeckoAPI.fetch({
        endpoint: CoinGeckoAPI.Blockchains.list.endpoint,
      });
      this.logger.debug('info', 'coingecko:fetchCoinGeckoBlockchainsList', { num: data.length });
      if (status != 200) {
        this.logger.discord('error', 'coingecko:fetchCoinGeckoBlockchainsList', JSON.stringify({ status, data }));
        return;
      }
      for (const { id, ...rest } of data) {
        await this.coinGeckoBlockchainModel._collection.findOneAndUpdate(
          { id },
          {
            $set: {
              id,
              ...rest,
              updated_at: new Date(),
              updated_by: 'system',
            },
            $setOnInsert: {
              created_at: new Date(),
              created_by: 'system',
            },
          },
          { upsert: true },
        );
      }
      this.logger.debug('success', 'coingecko:fetchCoinGeckoBlockchainsList');
    } catch (error) {
      this.logger.discord('error', 'coingecko:fetchCoinGeckoBlockchainsList', JSON.stringify(error));
      throw error;
    }
  }
  async fetchCoinGeckoExchangeList() {
    try {
      const { data, status } = await CoinGeckoAPI.fetch({
        endpoint: CoinGeckoAPI.Exchanges.list.endpoint,
      });
      this.logger.debug('info', 'coingecko:fetchCoinGeckoExchangeList', { num: data.length });
      if (status != 200) {
        this.logger.discord('error', 'coingecko:fetchCoinGeckoExchangeList', JSON.stringify({ status, data }));
        return;
      }
      for (const { id, name } of data) {
        await this.coinGeckoExchangeModel._collection.findOneAndUpdate(
          { id },
          {
            $set: {
              id,
              name,
              updated_at: new Date(),
              updated_by: 'system',
            },
            $setOnInsert: {
              created_at: new Date(),
              created_by: 'system',
            },
          },
          { upsert: true },
        );
      }
      this.logger.debug('success', 'coingecko:fetchCoinGeckoExchangeList');
    } catch (error) {
      this.logger.discord('error', 'coingecko:fetchCoinGeckoExchangeList', JSON.stringify(error));
      throw error;
    }
  }

  async addFetchCoinGeckoExchangeDetails() {
    try {
      const exchanges = await this.coinGeckoExchangeModel
        .get([
          {
            $project: {
              id: 1,
            },
          },
        ])
        .toArray();
      for (const { id } of exchanges) {
        this.addJob({
          name: 'coingecko:fetch:exchanges:details',
          payload: { id },
          options: {
            jobId: `coingecko:fetch:exchanges:details:${id}`,
            removeOnFail: true,
            removeOnComplete: true,
            delay: 1000 * 5,
          },
        });
      }

      this.logger.debug('success', 'coingecko:addFetchCoinGeckoExchangeDetails');
    } catch (error) {
      this.logger.discord('error', 'coingecko:addFetchCoinGeckoExchangeDetails', JSON.stringify(error));
      throw error;
    }
  }
  async fetchCoinGeckoExchangeDetails({ id }: { id: string }) {
    try {
      if (!id) {
        throw new Error('coingecko:fetchCoinGeckoExchangeDetails id is required');
      }
      const { data, status } = await CoinGeckoAPI.fetch({
        endpoint: `${CoinGeckoAPI.Exchanges.details.endpoint}/${id}`,
      });
      const { name, ...details } = data;
      await this.coinGeckoExchangeModel._collection.findOneAndUpdate(
        { id },
        {
          $set: {
            details,
            updated_at: new Date(),
            updated_by: 'system',
          },
          $setOnInsert: {
            created_at: new Date(),
            created_by: 'system',
          },
        },
        { upsert: true },
      );
    } catch (error) {
      this.logger.discord('error', 'coingecko:fetchCoinGeckoExchangeDetails', JSON.stringify(error));
      throw error;
    }
  }

  async fetchCoinGeckoCryptoCurrencyGlobal() {
    try {
      const {
        data: { data },
      } = await CoinGeckoAPI.fetch({
        endpoint: CoinGeckoAPI.Global.cryptoCurrencyGlobal.endpoint,
      });

      await this.coinGeckoCryptoCurrencyGlobalModel._collection.insertOne({
        ...data,
        updated_at: new Date(),
        updated_by: 'system',
      });

      this.logger.debug('success', 'coingecko:fetchCoinGeckoCryptoCurrencyGlobal');
    } catch (error) {
      this.logger.discord('error', 'coingecko:fetchCoinGeckoCryptoCurrencyGlobal', JSON.stringify(error));
      throw error;
    }
  }

  /**
   * @description add job to queue
   */
  addJob({
    name,
    payload = {},
    options = {
      repeat: {
        pattern: '* 0 0 * * *',
      },
    },
  }: {
    name: CoinGeckoJobNames;
    payload?: any;
    options?: JobsOptions;
  }) {
    this.queue
      .add(name, payload, options)
      .then((job) => this.logger.debug(`success`, `[addJob:success]`, { id: job.id, name, payload }))
      .catch((err) => this.logger.discord('error', `[addJob:error]`, err, name, JSON.stringify(payload)));
  }
  /**
   * Initialize Worker listeners
   * @private
   */
  private initWorkerListeners(worker: Worker) {
    // Completed
    worker.on('completed', ({ id, name, data }: Job<fetchCoinGeckoDataJob>) => {
      this.logger.discord('success', '[job:coingecko:completed]', id, name, JSON.stringify(data));
    });
    // Failed
    worker.on('failed', ({ id, name, data, failedReason }: Job<fetchCoinGeckoDataJob>, error: Error) => {
      this.logger.discord(
        'error',
        '[job:coingecko:error]',
        id,
        name,
        failedReason,
        JSON.stringify(data),
        JSON.stringify(error),
      );
    });
  }
  workerProcessor({ name, data }: Job<fetchCoinGeckoDataJob>): Promise<void> {
    // this.logger.discord('info', `[coingecko:workerProcessor:run]`, name);
    return this.jobs[name as keyof typeof this.jobs]?.call(this, data) || this.jobs.default();
  }
  async global(): Promise<any> {
    try {
      const xml = await axios.get('https://www.coingecko.com/en/overall_stats').then((r) => r.data.toString());
      const pricePattern = /(\$.+)/g;
      const matches = xml.matchAll(pricePattern);

      const data = [];
      for (const match of matches) {
        data.push(match[0]);
      }
      const marketCap = data[0] || 0;
      const volume = data[1] || 0;

      const pattern = /<span class="tw-text-blue-500">(.+)<\/span>/g;
      const otherMatches = xml.matchAll(pattern);

      for (const match of otherMatches) {
        data.push(match[1]);
      }
      const totalCoin = data[2] || 0;
      const exchanges = data[3] || 0;
      const dominace = [data[4] || 0, data[5] || 0];
      const gas = data[6] || 0;
      return { market_cap: marketCap, volume, total_coin: totalCoin, exchanges, gas, dominace };
    } catch (err) {
      this.logger.error('error', err.message);
      throw err;
    }
  }
}
