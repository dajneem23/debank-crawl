import Container, { Service, Token } from 'typedi';
import Logger from '@/core/logger';
import { toOutPut, toPagingOutput } from '@/utils/common';
import { $keysToProject, $toMongoFilter } from '@/utils/mongoDB';
import { assetTrendingModelToken } from '.';
import { assetSortBy, BaseServiceInput, BaseServiceOutput } from '@/types/Common';
import { Job, JobsOptions, Queue, QueueEvents, QueueScheduler, Worker } from 'bullmq';
import { env } from 'process';
import { DIRedisConnection } from '@/loaders/redisClientLoader';
import IORedis from 'ioredis';
import { AssetTrendingJobData, AssetTrendingJobNames } from './asset-trending.job';
import { KyberSwapAPI } from '@/common/api';

export class AssetTrendingService {
  private logger = new Logger('AssetTrendingService');

  readonly model = Container.get(assetTrendingModelToken);

  private readonly redisConnection: IORedis.Redis = Container.get(DIRedisConnection);

  private worker: Worker;

  private queue: Queue;

  private queueScheduler: QueueScheduler;

  private readonly jobs: {
    [key in AssetTrendingJobNames | 'default']?: (data?: any) => Promise<void>;
  } = {
    'asset-trending:fetch:trending': this.fetchAssetTrending,
    'asset-trending:fetch:trending-soon': this.fetchAssetTrendingSoon,
    default: () => {
      throw new Error('Invalid job name');
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

  get outputKeys(): typeof this.model._keys {
    return this.model._keys;
  }

  get assetKeys(): any[] {
    return [
      'avatar',
      'tvl_ratio',
      'num_market_pairs',
      'market_cap',
      'self_reported_market_cap',
      'market_cap_dominance',
      'fully_diluted_market_cap',
      'market_cap_by_total_supply',
      'total_supply',
      'circulating_supply',
      'self_reported_circulating_supply',
      'max_supply',
      'price',
      'volume',
      'cmc_rank',
      'slug',
      'percent_change_24h',
      'percent_change_7d',
      'percent_change_30d',
      'percent_change_60d',
      'percent_change_90d',
    ];
  }
  /**
   *  @description init BullMQ Worker
   */
  private initWorker() {
    this.worker = new Worker('asset-trending', this.workerProcessor.bind(this), {
      connection: this.redisConnection as any,
      lockDuration: 1000 * 60,
      concurrency: 20,
      limiter: {
        max: 1,
        duration: 5 * 60 * 1000,
      },
    });
    this.logger.debug('info', '[initWorker:asset-trending]', 'Worker initialized');
    this.initWorkerListeners(this.worker);
  }
  /**
   *  @description init BullMQ Queue
   */
  private initQueue() {
    this.queue = new Queue('asset-trending', {
      connection: this.redisConnection as any,
      defaultJobOptions: {
        // The total number of attempts to try the job until it completes
        attempts: 3,
        // Backoff setting for automatic retries if the job fails
        backoff: { type: 'exponential', delay: 3000 },
      },
    });
    this.queueScheduler = new QueueScheduler('asset-trending', {
      connection: this.redisConnection as any,
    });
    const queueEvents = new QueueEvents('asset-trending', {
      connection: this.redisConnection as any,
    });

    this.addFetchingDataJob();

    // queueEvents.on('completed', ({ jobId }) => {
    //   this.logger.debug('success', 'Job completed', { jobId });
    // });

    queueEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      this.logger.discord('error', 'asset-trending:Job failed', { jobId, failedReason });
    });
  }
  private addFetchingDataJob() {
    this.addJob({
      name: 'asset-trending:fetch:trending',
      payload: {},
      options: {
        repeatJobKey: 'asset-trending:fetch:trending',
        repeat: {
          pattern: '* 0 0 * * *',
        },
        // jobId: 'asset-trending:fetch:trending',
        removeOnComplete: true,
      },
    });
    this.addJob({
      name: 'asset-trending:fetch:trending-soon',
      payload: {},
      options: {
        repeatJobKey: 'asset-trending:fetch:trending-soon',
        repeat: {
          pattern: '* 0 0 * * *',
        },
        // jobId: 'asset-trending:fetch:trending-soon',
        removeOnComplete: true,
      },
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
        pattern: '* 0 0 * * *',
      },
    },
  }: {
    name: AssetTrendingJobNames;
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
    worker.on('completed', ({ id, name, data }: Job<AssetTrendingJobData>) => {
      this.logger.discord('success', '[job:asset-trending:completed]', id, name, JSON.stringify(data));
    });
    // Failed
    worker.on('failed', ({ id, name, data, failedReason }: Job<AssetTrendingJobData>, error: Error) => {
      this.logger.discord(
        'error',
        '[job:asset-trending:error]',
        id,
        name,
        failedReason,
        JSON.stringify(data),
        JSON.stringify(error),
      );
    });
  }
  workerProcessor({ name, data }: Job<AssetTrendingJobData>): Promise<void> {
    // this.logger.discord('info', `[workerProcessor:run]`, name);
    return this.jobs[name as keyof typeof this.jobs]?.call(this, {}) || this.jobs.default();
  }

  async fetchAssetTrending(): Promise<void> {
    try {
      // this.logger.debug('info', 'fetchAssetTrending');
      const {
        data: { data },
      } = await KyberSwapAPI.fetch({
        endpoint: KyberSwapAPI.AssetTrending.trending.endpoint,
        params: KyberSwapAPI.AssetTrending.trending.params,
      });
      const assetTrending = this.model._collection.findOne({ type: 'trending' });
      if (assetTrending) {
        this.model._collection.findOneAndUpdate(
          {
            type: 'trending',
          },
          {
            $set: { ...data, type: 'trending', updated_at: new Date(), updated_by: 'system' },
          },
          {
            upsert: true,
          },
        );
      } else {
        this.model._collection.insertOne({
          ...data,
          type: 'trending',
          created_at: new Date(),
          created_by: 'system',
        });
      }
      // this.logger.debug('info', 'fetchAssetTrending:success');
    } catch (err) {
      this.logger.discord('job_error', 'fetchAssetTrending', JSON.stringify(err));
      throw err;
    }
  }
  async fetchAssetTrendingSoon(): Promise<any> {
    try {
      // this.logger.debug('info', 'fetchAssetTrendingSoon');
      const {
        data: { data },
      } = await KyberSwapAPI.fetch({
        endpoint: KyberSwapAPI.AssetTrending.trending_soon.endpoint,
        params: KyberSwapAPI.AssetTrending.trending_soon.params,
      });
      const assetTrending = this.model._collection.findOne({ type: 'trending-soon' });
      if (assetTrending) {
        this.model._collection.findOneAndUpdate(
          {
            type: 'trending-soon',
          },
          {
            $set: { ...data, type: 'trending-soon', updated_at: new Date(), updated_by: 'system' },
          },
          {
            upsert: true,
          },
        );
      } else {
        this.model._collection.insertOne({
          ...data,
          type: 'trending-soon',
          created_at: new Date(),
          created_by: 'system',
        });
      }
      // this.logger.debug('info', 'fetchAssetTrendingSoon:success');
    } catch (err) {
      this.logger.discord('job_error', 'fetchAssetTrendingSoon', JSON.stringify(err));
      throw err;
    }
    // this.queue.add('asset-trending:fetch:trending', {}, { removeOnComplete: true });
  }
}
