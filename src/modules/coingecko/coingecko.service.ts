import Container, { Inject, Service, Token } from 'typedi';
import Logger from '@/core/logger';
import { sleep } from '@/utils/common';
import AuthSessionModel from '@/modules/auth/authSession.model';
import AuthService from '../auth/auth.service';
import { Job, JobsOptions, Queue, QueueEvents, QueueScheduler, Worker } from 'bullmq';
import { SystemError } from '@/core/errors';
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

const TOKEN_NAME = '_coingeckoService';
/**
 * A bridge allows another service access to the Model layer
 * @export CoingeckoAsset
 * @class CoingeckoAsset
 * @extends {BaseService}
 */
export const coinGeckoServiceToken = new Token<CoinGecko>(TOKEN_NAME);
/**
 * @class CoingeckoAsset
 * @extends BaseService
 * @description AssetTrending Service for all coingeckoAsset related operations
 */
@Service(coinGeckoServiceToken)
export class CoinGecko {
  private logger = new Logger('CoinGecko');

  private coinGeckoAssetModel = Container.get(coinGeckoAssetModelToken);

  private coinGeckoCategoriesModel = Container.get(coinGeckoCategoriesModelToken);

  private coinGeckoBlockchainModel = Container.get(coinGeckoBlockchainModelToken);

  private coinGeckoExchangeModel = Container.get(coinGeckoExchangeModelToken);

  private coinGeckoCryptoCurrencyGlobalModel = Container.get(coinGeckoCryptoCurrencyGlobalModelToken);

  @Inject()
  private authSessionModel: AuthSessionModel;

  @Inject()
  private authService: AuthService;

  private readonly redisConnection: IORedis.Redis = Container.get(DIRedisConnection);

  private worker: Worker;

  private queue: Queue;

  private queueScheduler: QueueScheduler;

  private readonly jobs: {
    [key in CoinGeckoJobNames | 'default']?: () => Promise<void>;
  } = {
    'coingecko:fetch:assets:list': this.fetchCoinGeckoAssetList,
    'coingecko:fetch:assets:details': this.fetchCoinGeckoAssetDetails,
    'coingecko:fetch:categories:list': this.fetchCoinGeckoCategoriesList,
    'coingecko:fetch:blockchains:list': this.fetchCoinGeckoBlockchainsList,
    'coingecko:fetch:exchanges:list': this.fetchCoinGeckoBlockchainsList,
    'coingecko:fetch:exchanges:details': this.fetchCoinGeckoExchangeDetails,
    'coingecko:fetch:cryptocurrency:global': this.fetchCoinGeckoCryptoCurrencyGlobal,
    default: () => {
      throw new SystemError('Invalid job name');
    },
  };

  constructor() {
    // this.fetchCoinGeckoAssetDetails();
    //this.fetchCoinGeckoCryptoCurrencyGlobal();
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
      connection: this.redisConnection as any,
      lockDuration: 1000 * 60 * 5,
      concurrency: 20,
      limiter: {
        max: 1,
        duration: 5 * 60 * 1000,
      },
    });
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
        attempts: 5,
        // Backoff setting for automatic retries if the job fails
        backoff: { type: 'exponential', delay: 3000 },
      },
    });
    this.queueScheduler = new QueueScheduler('coingecko', {
      connection: this.redisConnection as any,
    });
    const queueEvents = new QueueEvents('coingecko', {
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
      name: 'coingecko:fetch:assets:list',
      payload: {},
      options: {
        repeat: {
          pattern: '0 0 * * SUN',
        },
        jobId: 'coingecko:fetch:assets:list',
        removeOnComplete: true,
      },
    });
    this.addJob({
      name: 'coingecko:fetch:assets:details',
      payload: {},
      options: {
        repeat: {
          pattern: '* 0 0 * * *',
        },
        jobId: 'coingecko:fetch:assets:details',
        removeOnComplete: true,
      },
    });
    this.addJob({
      name: 'coingecko:fetch:categories:list',
      payload: {},
      options: {
        repeat: {
          pattern: '0 0 * * SUN',
        },
        jobId: 'coingecko:fetch:categories:list',
        removeOnComplete: true,
      },
    });
    this.addJob({
      name: 'coingecko:fetch:blockchains:list',
      payload: {},
      options: {
        repeat: {
          pattern: '0 0 * * SUN',
        },
        jobId: 'coingecko:fetch:blockchains:list',
        removeOnComplete: true,
      },
    });
    this.addJob({
      name: 'coingecko:fetch:exchanges:list',
      payload: {},
      options: {
        repeat: {
          pattern: '0 0 * * SUN',
        },
        jobId: 'coingecko:fetch:exchanges:list',
        removeOnComplete: true,
      },
    });
    this.addJob({
      name: 'coingecko:fetch:exchanges:details',
      payload: {},
      options: {
        repeat: {
          pattern: '* 0 0 * * *',
        },
        jobId: 'coingecko:fetch:exchanges:details',
        removeOnComplete: true,
      },
    });
    this.addJob({
      name: 'coingecko:fetch:cryptocurrency:global',
      payload: {},
      options: {
        repeat: {
          pattern: '* 0 0 * * *',
        },
        jobId: 'coingecko:fetch:cryptocurrency:global',
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
          },
          { upsert: true },
        );
      }
      this.logger.debug('success', 'Fetch CoinGecko Asset List');
    } catch (error) {
      this.logger.debug('error', 'Fetch CoinGecko Asset List', JSON.stringify(error));
    }
  }
  async fetchCoinGeckoAssetDetails() {
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
      this.logger.debug('info', 'fetchCoinGeckoAssetDetails', { num: assets.length });
      for (const { id } of assets) {
        await sleep(3000);
        const { data } = await CoinGeckoAPI.fetch({
          endpoint: `${CoinGeckoAPI.Coins.detail.endpoint}/${id}`,
          params: CoinGeckoAPI.Coins.detail.params,
        })
          .then((res) => {
            this.logger.debug('success', 'Fetch CoinGecko Asset Details', { id });
            return res;
          })
          .catch((error) => {
            this.logger.debug('error', 'Fetch CoinGecko Asset Details', JSON.stringify(error));
          });
        if (data) {
          const { id: _id, symbol, name, ...details } = data;
          await this.coinGeckoAssetModel._collection.findOneAndUpdate(
            { id },
            {
              $set: {
                details,
                updated_at: new Date(),
                updated_by: 'system',
              },
            },
            { upsert: true },
          );
        }
      }

      this.logger.debug('success', 'Fetch CoinGecko Asset Details');
    } catch (error) {
      this.logger.debug('error', 'Fetch CoinGecko Asset List', JSON.stringify(error));
    }
  }
  async fetchCoinGeckoCategoriesList() {
    try {
      const { data } = await CoinGeckoAPI.fetch({
        endpoint: CoinGeckoAPI.Categories.listWithMarketData.endpoint,
        params: CoinGeckoAPI.Categories.listWithMarketData.params,
      });
      this.logger.debug('info', 'fetchCoinGeckoCategoriesList', { num: data.length });
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
          },
          { upsert: true },
        );
      }
      this.logger.debug('success', 'Fetch CoinGecko Categories List');
    } catch (error) {
      this.logger.debug('error', 'Fetch CoinGecko Categories List', JSON.stringify(error));
    }
  }
  async fetchCoinGeckoBlockchainsList() {
    try {
      const { data } = await CoinGeckoAPI.fetch({
        endpoint: CoinGeckoAPI.Blockchains.list.endpoint,
      });
      this.logger.debug('info', 'fetchCoinGeckoBlockchainsList', { num: data.length });
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
          },
          { upsert: true },
        );
      }
      this.logger.debug('success', 'Fetch CoinGecko Blockchains List');
    } catch (error) {
      this.logger.debug('error', 'Fetch CoinGecko Blockchains List', JSON.stringify(error));
    }
  }
  async fetchCoinGeckoExchangeList() {
    try {
      const { data } = await CoinGeckoAPI.fetch({
        endpoint: CoinGeckoAPI.Exchanges.list.endpoint,
      });
      this.logger.debug('info', 'fetchCoinGeckoExchangeList', { num: data.length });
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
          },
          { upsert: true },
        );
      }
      this.logger.debug('success', 'Fetch CoinGecko Exchange List');
    } catch (error) {
      this.logger.debug('error', 'Fetch CoinGecko Exchange List', JSON.stringify(error));
    }
  }

  async fetchCoinGeckoExchangeDetails() {
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
      this.logger.debug('info', 'fetchCoinGeckoExchangeDetails', { num: exchanges.length });
      for (const { id } of exchanges) {
        await sleep(3000);
        const { data } = await CoinGeckoAPI.fetch({
          endpoint: `${CoinGeckoAPI.Exchanges.details.endpoint}/${id}`,
        })
          .then((res) => {
            this.logger.debug('success', 'Fetch CoinGecko Exchange Details', { id });
            return res;
          })
          .catch((error) => {
            this.logger.debug('error', 'Fetch CoinGecko Exchange Details', JSON.stringify(error));
          });
        if (data) {
          const { name, ...details } = data;
          await this.coinGeckoExchangeModel._collection.findOneAndUpdate(
            { id },
            {
              $set: {
                details,
                updated_at: new Date(),
                updated_by: 'system',
              },
            },
            { upsert: true },
          );
        }
      }

      this.logger.debug('success', 'Fetch CoinGecko Exchange Details');
    } catch (error) {
      this.logger.debug('error', 'Fetch CoinGecko Exchange List', JSON.stringify(error));
    }
  }

  async fetchCoinGeckoCryptoCurrencyGlobal() {
    try {
      const { data } = await CoinGeckoAPI.fetch({
        endpoint: CoinGeckoAPI.Global.cryptoCurrencyGlobal.endpoint,
      })
        .then(({ data }) => data)
        .catch((error) => {
          this.logger.debug('error', 'Fetch CoinGecko CryptoCurrency Global', JSON.stringify(error));
        });

      await this.coinGeckoCryptoCurrencyGlobalModel._collection.insertOne({
        ...data,
        updated_at: new Date(),
        updated_by: 'system',
      });

      this.logger.debug('success', 'Fetch CoinGecko CryptoCurrencyGlobal');
    } catch (error) {
      this.logger.debug('error', 'Fetch CoinGecko CryptoCurrencyGlobal', JSON.stringify(error));
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
      .then((job) => this.logger.debug(`success`, `[addJob:success]`, { id: job.id, payload }))
      .catch((err) => this.logger.error('error', `[addJob:error]`, err, payload));
  }
  /**
   * Initialize Worker listeners
   * @private
   */
  private initWorkerListeners(worker: Worker) {
    // Completed
    worker.on('completed', (job: Job<fetchCoinGeckoDataJob>) => {
      this.logger.debug('success', '[job:coingecko:completed]', {
        id: job.id,
        jobName: job.name,
        data: job.data,
      });
    });
    // Failed
    worker.on('failed', (job: Job<fetchCoinGeckoDataJob>, error: Error) => {
      this.logger.error('error', '[job:coingecko:error]', {
        jobId: job.id,
        error,
        jobName: job.name,
        data: job.data,
      });
    });
  }
  workerProcessor({ name, data }: Job<fetchCoinGeckoDataJob>): Promise<void> {
    this.logger.debug('info', `[workerProcessor]`, { name, data });
    return this.jobs[name as keyof typeof this.jobs]?.call(this, {}) || this.jobs.default();
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
      this.logger.error('get_error', err.message);
      throw err;
    }
  }
}
