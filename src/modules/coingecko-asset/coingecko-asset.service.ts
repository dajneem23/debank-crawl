import Container, { Inject, Service, Token } from 'typedi';
import Logger from '@/core/logger';
import { sleep, toOutPut, toPagingOutput } from '@/utils/common';
import AuthSessionModel from '@/modules/auth/authSession.model';
import AuthService from '../auth/auth.service';
import { $keysToProject, $pagination, $toMongoFilter } from '@/utils/mongoDB';
import { coinGeckoAssetModelToken } from '.';
import { assetSortBy, BaseServiceInput, BaseServiceOutput } from '@/types/Common';
import { Job, JobsOptions, Queue, QueueEvents, QueueScheduler, Worker } from 'bullmq';
import { SystemError } from '@/core/errors';
import { env } from 'process';
import { DIRedisConnection } from '@/loaders/redisClientLoader';
import IORedis from 'ioredis';
import { CoinGeckoAPI, KyberSwapAPI } from '@/common/api';
import { CoinGeckoJobNames, fetchCoinGeckoDataJob } from './coingecko-asset.job';
const TOKEN_NAME = '_coingeckoAssetService';
/**
 * A bridge allows another service access to the Model layer
 * @export CoingeckoAsset
 * @class CoingeckoAsset
 * @extends {BaseService}
 */
export const coinGeckoAssetServiceToken = new Token<CoingeckoAsset>(TOKEN_NAME);
/**
 * @class CoingeckoAsset
 * @extends BaseService
 * @description AssetTrending Service for all coingeckoAsset related operations
 */
@Service(coinGeckoAssetServiceToken)
export class CoingeckoAsset {
  private logger = new Logger('CoingeckoAsset');

  private model = Container.get(coinGeckoAssetModelToken);

  @Inject()
  private authSessionModel: AuthSessionModel;

  @Inject()
  private authService: AuthService;

  private readonly redisConnection: IORedis.Redis = Container.get(DIRedisConnection);

  private worker: Worker;

  private queue: Queue;

  private queueScheduler: QueueScheduler;

  private readonly jobs = {
    'coingecko-asset:fetch:list': this.fetchCoinGeckoAssetList,
    'coingecko-asset:fetch:details': this.fetchCoinGeckoAssetDetails,
    default: () => {
      throw new SystemError('Invalid job name');
    },
  };

  constructor() {
    // this.fetchCoinGeckoAssetDetails();
    if (env.MODE === 'production') {
      // Init Worker
      this.initWorker();
      // Init Queue
      this.initQueue();
    }
  }

  get outputKeys(): typeof this.model._keys {
    return this.model._keys;
  }

  /**
   *  @description init BullMQ Worker
   */
  private initWorker() {
    this.worker = new Worker('coingecko-asset', this.workerProcessor.bind(this), {
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
    this.queue = new Queue('coingecko-asset', {
      connection: this.redisConnection as any,
      defaultJobOptions: {
        // The total number of attempts to try the job until it completes
        attempts: 5,
        // Backoff setting for automatic retries if the job fails
        backoff: { type: 'exponential', delay: 3000 },
      },
    });
    this.queueScheduler = new QueueScheduler('coingecko-asset', {
      connection: this.redisConnection as any,
    });
    const queueEvents = new QueueEvents('coingecko-asset', {
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
      name: 'coingecko-asset:fetch:list',
      payload: {},
      options: {
        repeat: {
          pattern: '0 0 * * SUN',
        },
        jobId: 'coingecko-asset:fetch:list',
        removeOnComplete: true,
      },
    });
    this.addJob({
      name: 'coingecko-asset:fetch:details',
      payload: {},
      options: {
        repeat: {
          pattern: '* 0 0 * * *',
        },
        jobId: 'coingecko-asset:fetch:details',
        removeOnComplete: true,
      },
    });
  }
  async fetchCoinGeckoAssetList() {
    try {
      const { data } = await CoinGeckoAPI.fetch({
        endpoint: CoinGeckoAPI.Coins.list.endpoint,
      });
      this.logger.debug('info', 'fetchCoinGeckoAssetList', { num: data.length });
      for (const asset of data) {
        const { id, name, symbol } = asset;

        await this.model._collection.findOneAndUpdate(
          { id },
          {
            $set: {
              id,
              name,
              symbol,
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
      const assets = await this.model
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
          await this.model._collection.findOneAndUpdate(
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
      this.logger.debug('success', '[job:coingecko-asset:completed]', {
        id: job.id,
        jobName: job.name,
        data: job.data,
      });
    });
    // Failed
    worker.on('failed', (job: Job<fetchCoinGeckoDataJob>, error: Error) => {
      this.logger.error('error', '[job:coingecko-asset:error]', {
        jobId: job.id,
        error,
        jobName: job.name,
        data: job.data,
      });
    });
  }
  workerProcessor(job: Job<fetchCoinGeckoDataJob>): Promise<void> {
    const { name } = job;
    this.logger.debug('info', `[workerProcessor]`, { name, data: job.data });
    return this.jobs[name as keyof typeof this.jobs]?.call(this, {}) || this.jobs.default();
  }
}
