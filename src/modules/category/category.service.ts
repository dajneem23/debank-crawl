import Container, { Inject, Service, Token } from 'typedi';
import Logger from '@/core/logger';
import { throwErr, toOutPut, toPagingOutput } from '@/utils/common';
import { alphabetSize12 } from '@/utils/randomString';

import { $pagination, $toMongoFilter, $keysToProject } from '@/utils/mongoDB';
import { CategoryModel, CategoryError, Category, _category, categoryModelToken } from '.';
import { BaseServiceInput, BaseServiceOutput, CATEGORY_TYPE, PRIVATE_KEYS, RemoveSlugPattern } from '@/types/Common';
import { isNil, omit } from 'lodash';
import slugify from 'slugify';
import { ObjectId } from 'mongodb';
import { CoinMarketCapAPI } from '@/common/api';
import IORedis from 'ioredis';
import { DIRedisConnection } from '@/loaders/redisClientLoader';
import { Job, JobsOptions, Queue, QueueEvents, QueueScheduler, Worker } from 'bullmq';
import { SystemError } from '@/core/errors';
import { CategoryJobData, CategoryJobNames } from './category.job';
import { env } from 'process';

const TOKEN_NAME = '_categoryService';
/**
 * A bridge allows another service access to the Model layer
 * @export CategoryService
 * @class CategoryService
 * @extends {BaseService}
 */
export const categoryServiceToken = new Token<CategoryService>(TOKEN_NAME);
@Service(categoryServiceToken)
export class CategoryService {
  private logger = new Logger('Categories');

  private model = Container.get(categoryModelToken);

  private readonly redisConnection: IORedis.Redis = Container.get(DIRedisConnection);

  private worker: Worker;

  private queue: Queue;

  private queueScheduler: QueueScheduler;

  get outputKeys() {
    return this.model._keys;
  }

  get publicOutputKeys() {
    return ['id', 'title', 'name', 'sub_categories', 'weight', 'rank'];
  }
  get transKeys() {
    return ['title', 'name'];
  }

  /**
   * Generate ID
   */
  static async generateID() {
    return alphabetSize12();
  }
  constructor() {
    if (env.MODE === 'production') {
      // Init Worker
      this.initWorker();
      // Init Queue
      this.initQueue();
    }
  }
  private readonly jobs = {
    'category:fetch:all': this.fetchAllCategory,
    // 'category:fetch:info': this.fetchOHLCV,
    default: () => {
      throw new SystemError('Invalid job name');
    },
  };

  /**
   *  @description init BullMQ Worker
   */
  private initWorker() {
    this.worker = new Worker('category', this.workerProcessor.bind(this), {
      connection: this.redisConnection as any,
      concurrency: 20,
      limiter: {
        max: 1,
        duration: 1000,
      },
    });
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
        attempts: 5,
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
      name: 'category:fetch:all',
      payload: {},
      options: {
        repeat: {
          every: +CoinMarketCapAPI.cryptocurrency.INTERVAL,
        },
        jobId: 'category:fetch:all',
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
      .then((job) => this.logger.debug(`success`, `[addJob:success]`, { id: job.id, payload }))
      .catch((err) => this.logger.error('error', `[addJob:error]`, err, payload));
  }
  workerProcessor(job: Job<CategoryJobData>): Promise<void> {
    const { name } = job;
    this.logger.debug('info', `[workerProcessor]`, { name, data: job.data });
    return this.jobs[name as keyof typeof this.jobs]?.call(this, {}) || this.jobs.default();
  }
  /**
   * Initialize Worker listeners
   * @private
   */
  private initWorkerListeners(worker: Worker) {
    // Completed
    worker.on('completed', (job: Job<CategoryJobData>) => {
      this.logger.debug('success', '[job:category:completed]', { id: job.id, jobName: job.name, data: job.data });
    });
    // Failed
    worker.on('failed', (job: Job<CategoryJobData>, error: Error) => {
      this.logger.error('error', '[job:category:error]', { jobId: job.id, error, jobName: job.name, data: job.data });
    });
  }
  /**
   * Create a new category
   * @param _content
   * @param subject
   * @returns {Promise<CategoryOutput>}
   */
  async create({ _content, _subject }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { title, sub_categories = [] } = _content;
      sub_categories.length && (_content.sub_categories = await this.createSubCategories(sub_categories, _subject));
      _content.name = slugify(title, {
        trim: true,
        lower: true,
        remove: RemoveSlugPattern,
      });
      const value = await this.model.create(
        { name: _content.name },
        {
          ..._category,
          ..._content,
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
   * @returns {Promise<Category>}
   */
  async update({ _id, _content, _subject }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { sub_categories = [] } = _content;
      sub_categories.length && (_content.sub_categories = await this.createSubCategories(sub_categories, _subject));
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
   * @returns {Promise<Category>}
   */
  async delete({ _id, _subject }: BaseServiceInput): Promise<void> {
    try {
      await this.model.delete($toMongoFilter({ _id }), {
        $set: {
          ...(_subject && { deleted_by: _subject }),
        },
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
  async query({ _filter, _query }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { type, lang, rank = 0, q } = _filter;
      const { page = 1, per_page, sort_by, sort_order } = _query;
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model
        .get(
          $pagination({
            $match: {
              ...(type && {
                type: { $in: Array.isArray(type) ? type : [type] },
              }),
              ...(!isNil(rank) && {
                rank: { $eq: rank },
              }),
              ...(lang && {
                'trans.lang': { $eq: lang },
              }),
              ...(q && {
                title: { $regex: q, $options: 'i' },
              }),
            },
            $lookups: [this.model.$lookups.sub_categories],
            $projects: [
              {
                $project: {
                  ...$keysToProject(this.publicOutputKeys),
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
            ],
            $more: [
              ...((lang && [this.model.$sets.trans]) || []),
              {
                $project: {
                  ...$keysToProject(this.publicOutputKeys),
                  ...(lang && $keysToProject(this.transKeys, '$trans')),
                },
              },
            ],
            ...(sort_by && sort_order && { $sort: { [sort_by]: sort_order == 'asc' ? 1 : -1 } }),
            ...(per_page && page && { items: [{ $skip: +per_page * (+page - 1) }, { $limit: +per_page }] }),
          }),
        )
        .toArray();
      this.logger.debug('query_success', { total_count, items });
      return toPagingOutput({ items, total_count, keys: this.publicOutputKeys });
    } catch (err) {
      this.logger.error('query_error', err.message);
      throw err;
    }
  }
  /**
   * Get Category by ID
   * @param _id - Category ID
   * @returns { Promise<CategoryOutput> } - Category
   */
  async getById({ _id }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const [category] = await this.model
        .get([
          {
            $match: $toMongoFilter({ _id }),
          },
          this.model.$lookups.sub_categories,
          {
            $limit: 1,
          },
        ])
        .toArray();
      if (isNil(category)) throwErr(new CategoryError('CATEGORY_NOT_FOUND'));
      this.logger.debug('get_success', { category });
      return omit(toOutPut({ item: category }), ['deleted', 'updated_at']);
    } catch (err) {
      this.logger.error('get_error', err.message);
      throw err;
    }
  }
  /**
   * Get Category by name
   * @param _id - Category ID
   * @returns { Promise<CategoryOutput> } - Category
   */
  async getByName({ _name, _filter, _permission }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { lang, type } = _filter;
      const [category] = await this.model
        .get([
          {
            $match: $toMongoFilter({
              name: { $regex: _name, $options: 'i' },
              ...((type && type) || {}),
              ...(lang && {
                'trans.lang': { $eq: lang },
              }),
            }),
          },
          { ...this.model.$lookups.sub_categories },
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
          ...((lang && [this.model.$sets.trans]) || []),
          {
            $project: {
              ...$keysToProject(this.outputKeys),
              ...(lang && $keysToProject(this.transKeys, '$trans')),
            },
          },

          {
            $limit: 1,
          },
        ])
        .toArray();
      if (isNil(category)) throwErr(new CategoryError('CATEGORY_NOT_FOUND'));
      this.logger.debug('get_success', { category });
      return _permission == 'private' ? toOutPut({ item: category }) : omit(toOutPut({ item: category }), PRIVATE_KEYS);
    } catch (err) {
      this.logger.error('get_error', err.message);
      throw err;
    }
  }
  /**
   *  Search category
   * @param {any} _filter
   * @param {BaseQuery} _query
   * @returns {Promise<BaseServiceOutput>}
   */
  async search({ _filter, _query }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { q, lang, type, rank = 0 } = _filter;
      const { page = 1, per_page = 10 } = _query;
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model
        .get([
          ...$pagination({
            $match: {
              ...(type && {
                type: { $in: Array.isArray(type) ? type : [type] },
              }),
              ...(!isNil(rank) && {
                rank: { $eq: rank },
              }),
              ...(q && {
                $or: [{ $text: { $search: q } }, { title: { $regex: q, $options: 'i' } }],
              }),
            },

            $projects: [
              {
                $project: {
                  ...$keysToProject(this.publicOutputKeys),
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
            ],
            $more: [
              ...((lang && [this.model.$sets.trans]) || []),
              {
                $project: {
                  ...$keysToProject(this.publicOutputKeys),
                  ...(lang && $keysToProject(this.transKeys, '$trans')),
                },
              },
            ],
            ...(per_page && page && { items: [{ $skip: +per_page * (+page - 1) }, { $limit: +per_page }] }),
          }),
        ])
        .toArray();
      this.logger.debug('query_success', { total_count, items });
      return toPagingOutput({ items, total_count, keys: this.publicOutputKeys });
    } catch (err) {
      this.logger.error('query_error', err.message);
      throw err;
    }
  }
  createSubCategories(categories: Category[] = [], _subject: string, rank = 0): Promise<ObjectId[]> {
    return Promise.all(
      categories.map(async ({ title, type, sub_categories = [] }) => {
        const {
          value,
          ok,
          lastErrorObject: { updatedExisting },
        } = await this.model._collection.findOneAndUpdate(
          {
            name: slugify(title, {
              trim: true,
              lower: true,
              remove: RemoveSlugPattern,
            }),
          },
          {
            $setOnInsert: {
              title,
              name: slugify(title, {
                trim: true,
                lower: true,
                remove: RemoveSlugPattern,
              }),
              type,
              sub_categories: await this.createSubCategories(sub_categories, _subject, rank + 1),
              created_at: new Date(),
              updated_at: new Date(),
              rank,
              deleted: false,
              created_by: _subject,
            },
          },
          {
            upsert: true,
            returnDocument: 'after',
          },
        );
        return value._id;
      }),
    );
  }
  async fetchAllCategory(): Promise<void> {
    const {
      data: { data: categories },
    } = await CoinMarketCapAPI.fetchCoinMarketCapAPI({
      endpoint: CoinMarketCapAPI.cryptocurrency.categories,
      params: {
        limit: 5000,
        start: 1,
      },
    });
    // this.logger.debug('info', JSON.stringify(categories));
    for (const category of categories) {
      const market_data = {
        'market_data.num_tokens': category.num_tokens,
        'market_data.avg_price_change': category.avg_price_change,
        'market_data.market_cap': category.market_cap,
        'market_data.market_cap_change': category.market_cap_change,
        'market_data.volume': category.volume,
        'market_data.volume_change': category.volume_change,
      };
      const {
        value,
        ok,
        lastErrorObject: { updatedExisting },
      } = await this.model._collection.findOneAndUpdate(
        {
          name: slugify(category.name, {
            trim: true,
            lower: true,
            remove: RemoveSlugPattern,
          }),
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
      if (!updatedExisting) {
        await this.model._collection.findOneAndUpdate(
          {
            name: slugify(category.name, {
              trim: true,
              lower: true,
              remove: RemoveSlugPattern,
            }),
          },
          {
            $setOnInsert: {
              title: category.title,
              name: slugify(category.name, {
                trim: true,
                lower: true,
                remove: RemoveSlugPattern,
              }),
              description: category.description,
              type: CATEGORY_TYPE.CRYPTO_ASSET,
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
          },
          {
            upsert: true,
            returnDocument: 'after',
          },
        );
      }
    }
  }
}
