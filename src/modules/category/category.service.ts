import Container, { Inject, Service, Token } from 'typedi';
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
import { SystemError } from '@/core/errors';
import { CategoryJobData, CategoryJobNames } from './category.job';
import { env } from 'process';
import { AssetModel, assetModelToken } from '../asset';

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

  private AssetModel = Container.get<AssetModel>(assetModelToken);

  private readonly redisConnection: IORedis.Redis = Container.get(DIRedisConnection);

  private worker: Worker;

  private queue: Queue;

  private queueScheduler: QueueScheduler;

  get outputKeys() {
    return this.model._keys;
  }

  get publicOutputKeys() {
    return ['id', 'title', 'name', 'sub_categories', 'weight', 'rank', 'type'];
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
  private readonly jobs = {
    'category:fetch:all': this.fetchAllCategory,
    // 'category:fetch:info': this.fetchCategoryInfo,
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
      lockDuration: 1000 * 60 * 5,
      concurrency: 20,
      limiter: {
        max: 1,
        duration: 600000,
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
      sub_categories.length &&
        (_content.sub_categories = await this.createSubCategories(sub_categories, _subject, 0, true));
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
  async query({ _filter, _query, _permission = 'public' }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { type, lang, rank, deleted = false } = _filter;
      const { offset = 1, limit, sort_by, sort_order, keyword } = _query;
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model
        .get(
          $pagination({
            $match: {
              ...((_permission === 'private' && {
                deleted,
              }) || {
                deleted: false,
              }),
              ...(type && {
                type: { $in: Array.isArray(type) ? type : [type] },
              }),
              ...(!isNil(rank) && {
                rank: { $eq: rank },
              }),
              ...(lang && {
                'trans.lang': { $eq: lang },
              }),
              ...(keyword && {
                title: { $regex: keyword, $options: 'i' },
              }),
            },
            $lookups: [this.model.$lookups.sub_categories],
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
            ...(limit && offset && { items: [{ $skip: +limit * (+offset - 1) }, { $limit: +limit }] }),
          }),
        )
        .toArray();
      this.logger.debug('query_success', { total_count, items });
      return toPagingOutput({
        items,
        total_count,
        has_next: total_count > offset * limit,
        keys: this.publicOutputKeys,
      });
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
      const { lang, type, rank } = _filter;
      const { offset = 1, limit = 10, keyword } = _query;
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
              ...(keyword && {
                $or: [{ $text: { $search: keyword } }, { title: { $regex: keyword, $options: 'i' } }],
              }),
            },

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
        keys: this.publicOutputKeys,
      });
    } catch (err) {
      this.logger.error('query_error', err.message);
      throw err;
    }
  }
  /**
   *
   * @param categories - Categories to be created or updated
   * @param _subject - User who created or updated the categories
   * @param rank - Rank of the categories
   * @param update - allow update
   * @returns
   */
  createSubCategories(categories: any[] = [], _subject: string, rank = 0, update = false): Promise<ObjectId[]> {
    return Promise.all(
      categories.map(async ({ title, type, sub_categories = [], trans = [], weight }) => {
        const name = slugify(title, {
          trim: true,
          lower: true,
          remove: RemoveSlugPattern,
        });
        const {
          value,
          lastErrorObject: { updatedExisting },
        } = await this.model._collection.findOneAndUpdate(
          {
            name,
          },
          {
            $set: {
              ...((update && {
                title,
                name,
                sub_categories: await this.createSubCategories(sub_categories, _subject, rank + 1, update),
                updated_at: new Date(),
                weight,
                trans,
                rank,
                deleted: false,
                updated_by: _subject,
              }) ||
                {}),
            },
            $addToSet: {
              ...(type && {
                type: { $each: Array.isArray(type) ? type : [type] },
              }),
            } as any,
          },
          {
            upsert: false,
            returnDocument: 'after',
          },
        );
        if (!updatedExisting) {
          const { value: newValue } = await this.model._collection.findOneAndUpdate(
            {
              name,
            },
            {
              $setOnInsert: {
                title,
                name,
                sub_categories: await this.createSubCategories(sub_categories, _subject, rank + 1, update),
                updated_at: new Date(),
                created_at: new Date(),
                weight,
                trans,
                rank,
                deleted: false,
                created_by: _subject,
              },
              $addToSet: {
                ...((type && {
                  type: { $each: Array.isArray(type) ? type : [type] },
                }) as any),
              },
            },
            {
              upsert: true,
              returnDocument: 'after',
            },
          );
          return newValue.name;
        }
        return value.name;
      }),
    );
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
        const {
          lastErrorObject: { updatedExisting },
        } = await this.model._collection.findOneAndUpdate(
          {
            name: slugify(name, {
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
          await sleep(1000);
          const {
            value: { _id: categoryId },
          } = await this.model._collection.findOneAndUpdate(
            {
              name: slugify(name, {
                trim: true,
                lower: true,
                remove: RemoveSlugPattern,
              }),
            },
            {
              $setOnInsert: {
                source_id: id,
                title: title,
                name: slugify(name, {
                  trim: true,
                  lower: true,
                  remove: RemoveSlugPattern,
                }),
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
                  categories: categoryId as never,
                },
              },
            );
            // this.logger.debug('info', JSON.stringify({ coin, name }));
          }
        }
      }
      this.logger.debug('success', 'fetch_all_category DONE');
    } catch (error) {
      this.logger.debug('job_error', 'fetchAllCategory', JSON.stringify(error));
    }
  }
}
