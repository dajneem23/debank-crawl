import Container, { Service, Token } from 'typedi';
import Logger from '@/core/logger';
import { sleep, throwErr, toOutPut, toPagingOutput } from '@/utils/common';
import { $pagination, $toMongoFilter, $keysToProject } from '@/utils/mongoDB';
import { CategoryModel, CategoryError, Category, _category, categoryModelToken } from '.';
import { BaseServiceInput, BaseServiceOutput, CATEGORY_TYPE, PRIVATE_KEYS, RemoveSlugPattern } from '@/types/Common';
import { isNil, omit, omitBy } from 'lodash';
import slugify from 'slugify';
import { ObjectId } from 'mongodb';
import { CoinMarketCapAPI } from '@/common/api';
import IORedis from 'ioredis';
import { DIRedisConnection } from '@/loaders/redisClientLoader';
import { Job, JobsOptions, Queue, QueueEvents, QueueScheduler, Worker } from 'bullmq';
import { CategoryJobData, CategoryJobNames } from './category.job';
import { env } from 'process';
import { AssetModel, assetModelToken } from '../asset';

export class CategoryService {
  private logger = new Logger('Categories');

  readonly model = Container.get(categoryModelToken);

  private AssetModel = Container.get<AssetModel>(assetModelToken);

  private readonly redisConnection: IORedis.Redis = Container.get(DIRedisConnection);

  private worker: Worker;

  private queue: Queue;

  private queueScheduler: QueueScheduler;

  get outputKeys() {
    return this.model._keys;
  }

  get publicOutputKeys() {
    return ['id', 'title', 'name', 'weight', 'rank', 'type'];
  }
  get transKeys() {
    return ['title', 'name'];
  }

  constructor() {
    // this.fetchAllCategory();
    if (env.MODE === 'production') {
      this.initWorker();
      this.initQueue();
    }
  }
  private readonly jobs: {
    [key in CategoryJobNames | 'default']?: () => Promise<void>;
  } = {
    'category:fetch:all': this.fetchAllCategory,
    // 'category:fetch:info': this.fetchCategoryInfo,
    default: () => {
      throw new Error('Invalid job name');
    },
  };

  /**
   *  @description init BullMQ Worker
   */
  private initWorker() {
    this.worker = new Worker('category', this.workerProcessor.bind(this), {
      connection: this.redisConnection as any,
      lockDuration: 1000 * 60,
      concurrency: 20,
      limiter: {
        max: 1,
        duration: 600000,
      },
    });
    this.logger.debug('info', '[initWorker:category]', 'Worker initialized');

    this.initWorkerListeners(this.worker);
  }
  /**
   *  @description init BullMQ Queue
   */
  private initQueue() {
    this.queue = new Queue('category', {
      connection: this.redisConnection as any,
      defaultJobOptions: {
        // The total number of attempts to try the job until it completes
        attempts: 3,
        // Backoff setting for automatic retries if the job fails
        backoff: { type: 'exponential', delay: 3000 },
      },
    });
    this.queueScheduler = new QueueScheduler('category', {
      connection: this.redisConnection as any,
    });
    const queueEvents = new QueueEvents('category', {
      connection: this.redisConnection as any,
    });

    // this.addFetchingDataJob();

    // queueEvents.on('completed', ({ jobId }) => {
    //   this.logger.debug('success', 'Job completed', { jobId });
    // });

    queueEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      this.logger.discord('error', 'category:Job failed', jobId, failedReason);
    });
  }

  private addFetchingDataJob() {
    this.addJob({
      name: 'category:fetch:all',
      payload: {},
      options: {
        repeatJobKey: 'category:fetch:all',
        repeat: {
          pattern: '* 0 0 * * *',
        },
        jobId: 'category:fetch:all',
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
        every: +CoinMarketCapAPI.cryptocurrency.INTERVAL,
      },
    },
  }: {
    name: CategoryJobNames;
    payload?: any;
    options?: JobsOptions;
  }) {
    this.queue
      .add(name, payload, options)
      .then((job) => this.logger.debug(`success`, `[addJob:success]`, { id: job.id, name, payload }))
      .catch((err) =>
        this.logger.discord('error', `[addJob:error]`, err, name, JSON.stringify(payload), JSON.stringify(err)),
      );
  }
  workerProcessor({ name, data }: Job<CategoryJobData>): Promise<void> {
    this.logger.discord('info', `[category:workerProcessor:run]`, name);
    return this.jobs[name as keyof typeof this.jobs]?.call(this, {}) || this.jobs.default();
  }
  /**
   * Initialize Worker listeners
   * @private
   */
  private initWorkerListeners(worker: Worker) {
    // Completed
    worker.on('completed', ({ name, id, data }: Job<CategoryJobData>) => {
      this.logger.discord('success', '[job:category:completed]', id, name, JSON.stringify(data));
    });
    // Failed
    worker.on('failed', ({ id, name, data, failedReason }: Job<CategoryJobData>, error: Error) => {
      this.logger.discord(
        'error',
        '[job:category:error]',
        id,
        name,
        failedReason,
        JSON.stringify(data),
        JSON.stringify(error),
      );
    });
  }

  async fetchAllCategory(): Promise<void> {
    try {
      this.logger.debug('info', 'fetch_all_category start');
      const {
        data: { data: categories },
      } = await CoinMarketCapAPI.fetch({
        endpoint: CoinMarketCapAPI.cryptocurrency.categories,
        params: {
          limit: 5000,
          start: 1,
        },
      });
      // this.logger.debug('info', JSON.stringify(categories));
      for (const {
        id,
        name,
        description,
        title,
        num_tokens,
        avg_price_change,
        market_cap,
        market_cap_change,
        volume,
        volume_change,
      } of categories) {
        this.logger.debug('info', `fetch_category ${name}`);
        const market_data = omitBy(
          {
            'market_data.num_tokens': num_tokens,
            'market_data.avg_price_change': avg_price_change,
            'market_data.market_cap': market_cap,
            'market_data.market_cap_change': market_cap_change,
            'market_data.volume': volume,
            'market_data.volume_change': volume_change,
          },
          isNil,
        );
        let _categoryName = '';
        const slugifyName = slugify(name, {
          trim: true,
          lower: true,
          remove: RemoveSlugPattern,
        });
        const {
          value,
          lastErrorObject: { updatedExisting },
        } = await this.model._collection.findOneAndUpdate(
          {
            $or: [
              {
                dics: slugifyName,
              },
              {
                name: slugifyName,
              },
              {
                title,
              },
            ],
          },
          {
            $set: {
              updated_by: 'system',
              updated_at: new Date(),
              ...market_data,
            },
          },
          {
            upsert: false,
            returnDocument: 'after',
          },
        );
        _categoryName = value?.name;

        if (!updatedExisting) {
          const {
            value: { name: categoryName },
          } = await this.model._collection.findOneAndUpdate(
            {
              name: slugifyName,
            },
            {
              $setOnInsert: {
                'id_of_sources.CoinMarketCap': id,
                title: title,
                name: slugifyName,
                description: description,
                sub_categories: [],
                trans: [],
                created_at: new Date(),
                updated_at: new Date(),
                rank: 0,
                weight: 0,
                deleted: false,
                created_by: 'system',
                source: 'coinmarketcap',
                ...market_data,
              },
              $addToSet: {
                type: CATEGORY_TYPE.COINMARKETCAP,
              } as any,
            },
            {
              upsert: true,
              returnDocument: 'after',
            },
          );
          _categoryName = categoryName;
        }
        await sleep(1500);
        const {
          data: {
            data: { coins = [] },
          },
        } = await CoinMarketCapAPI.fetch({
          endpoint: CoinMarketCapAPI.cryptocurrency.category,
          params: {
            id,
          },
        });
        for (const { name, slug } of coins) {
          const { value: coin } = await this.AssetModel._collection.findOneAndUpdate(
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
              $addToSet: {
                categories: _categoryName as never,
              },
            },
          );
        }
      }
      this.logger.debug('success', 'fetch_all_category DONE');
    } catch (error) {
      this.logger.discord('job_error', 'fetchAllCategory', JSON.stringify(error));
      throw error;
    }
  }
}
