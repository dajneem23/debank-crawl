import Container, { Inject, Service, Token } from 'typedi';
import Logger from '@/core/logger';
import { throwErr, toOutPut, toPagingOutput } from '@/utils/common';
import { alphabetSize12 } from '@/utils/randomString';
import AuthSessionModel from '@/modules/auth/authSession.model';
import AuthService from '../auth/auth.service';
import { $toObjectId, $pagination, $toMongoFilter, $queryByList, $keysToProject } from '@/utils/mongoDB';
import { _exchange, exchangeModelToken } from '.';
import { BaseServiceInput, BaseServiceOutput, PRIVATE_KEYS } from '@/types/Common';
import { isNil, omit } from 'lodash';
import IORedis from 'ioredis';
import { Queue, QueueEvents, QueueScheduler, Worker } from 'bullmq';
import { DIRedisConnection } from '@/loaders/redisClientLoader';
import { SystemError } from '@/core/errors';
import { CoinMarketCapAPI } from '@/common/api';
const TOKEN_NAME = '_exchangeService';
/**
 * A bridge allows another service access to the Model layer
 * @export ExchangeService
 * @class ExchangeService
 * @extends {BaseService}
 */
export const ExchangeServiceToken = new Token<ExchangeService>(TOKEN_NAME);
/**
 * @class ExchangeService
 * @extends BaseService
 * @description Exchange Service for all exchange related operations
 */
@Service(ExchangeServiceToken)
export class ExchangeService {
  private logger = new Logger('ExchangeService');

  private model = Container.get(exchangeModelToken);

  private readonly redisConnection: IORedis.Redis = Container.get(DIRedisConnection);

  private worker: Worker;

  private queue: Queue;

  private queueScheduler: QueueScheduler;

  private readonly jobs = {
    'exchange:fetch:info': this.fetchExchangeInfo,
    default: () => {
      throw new SystemError('Invalid job name');
    },
  };

  @Inject()
  private authSessionModel: AuthSessionModel;

  @Inject()
  private authService: AuthService;

  get outputKeys(): typeof this.model._keys {
    return this.model._keys;
  }
  get publicOutputKeys() {
    return ['id', 'avatar', 'slug', 'categories', 'about', 'short_description', 'name', 'author'];
  }
  get transKeys() {
    return ['about', 'short_description'];
  }
  constructor() {
    this.fetchExchangeInfo();
  }
  /**
   * Generate ID
   */
  static async generateID() {
    return alphabetSize12();
  }
  /**
   * Create a new exchange
   * @param _content
   * @param _subject
   * @returns {Promise<BaseServiceOutput>}
   */
  async create({ _content, _subject }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { name, categories = [], trans = [] } = _content;
      const value = await this.model.create(
        {
          name,
        },
        {
          ..._exchange,
          ..._content,
          categories,
          trans,
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
   * Update exchange
   * @param _id
   * @param _content
   * @param _subject
   * @returns {Promise<Exchange>}
   */
  async update({ _id, _content, _subject }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const value = await this.model.update($toMongoFilter({ _id }), {
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
   * Delete exchange
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
   *  Query exchange
   * @param {any} _filter
   * @param {BaseQuery} _query
   * @returns {Promise<BaseServiceOutput>}
   *
   **/
  async query({ _filter, _query, _permission }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { lang, q, categories = [] } = _filter;
      const { page = 1, per_page, sort_by, sort_order } = _query;
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model
        .get(
          $pagination({
            $match: {
              deleted: false,
              ...(q && {
                name: { $regex: q, $options: 'i' },
              }),
              ...(categories.length && {
                $or: [
                  {
                    categories: {
                      $in: $toObjectId(categories),
                    },
                  },
                ],
              }),
              ...(lang && {
                'trans.lang': { $eq: lang },
              }),
            },
            $addFields: this.model.$addFields.categories,
            $lookups: [this.model.$lookups.categories],
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
      return toPagingOutput({
        items,
        total_count,
        keys: _permission == 'public' ? this.publicOutputKeys : this.outputKeys,
      });
    } catch (err) {
      this.logger.error('query_error', err.message);
      throw err;
    }
  }
  /**
   * Get Exchange by ID
   * @param id - Exchange ID
   * @returns { Promise<BaseServiceOutput> } - Exchange
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
          this.model.$lookups.team,
          this.model.$lookups.products,
          this.model.$lookups.projects,
          this.model.$lookups.country,
          this.model.$sets.author,
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
      if (isNil(item))
        this.model.error('common.not_found', [
          {
            path: '_id' + (lang ? ` ${lang}` : ''),
            message: `${_id + (lang ? ` ${lang}` : '')} not found`,
          },
        ]);
      this.logger.debug('get_success', { item });
      return _permission == 'private' ? toOutPut({ item }) : omit(toOutPut({ item }), PRIVATE_KEYS);
    } catch (err) {
      this.logger.error('get_error', err.message);
      throw err;
    }
  }
  /**
   * Get Exchange by slug
   * @param id - Exchange ID
   * @returns { Promise<BaseServiceOutput> } - Exchange
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
          this.model.$lookups.team,
          this.model.$lookups.products,
          this.model.$lookups.projects,
          this.model.$lookups.country,
          this.model.$sets.author,
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
      if (isNil(item))
        this.model.error('common.not_found', [
          {
            path: '_slug' + (lang ? ` ${lang}` : ''),
            message: `${_slug + (lang ? ` ${lang}` : '')} not found`,
          },
        ]);
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
  async search({ _filter, _query }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { q, lang } = _filter;
      const { page = 1, per_page = 10, sort_by, sort_order } = _query;
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model
        .get([
          ...$pagination({
            $match: {
              deleted: false,
              ...(q && {
                $or: [
                  { $text: { $search: q } },
                  {
                    name: { $regex: q, $options: 'i' },
                  },
                ],
              }),
              ...(lang && {
                'trans.lang': { $eq: lang },
              }),
            },
            $addFields: this.model.$addFields.categories,
            $lookups: [this.model.$lookups.categories],
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
  /**
   *  @description init BullMQ Queue
   */
  private initQueue() {
    this.queue = new Queue('coin', {
      connection: this.redisConnection as any,
      defaultJobOptions: {
        // The total number of attempts to try the job until it completes
        attempts: 5,
        // Backoff setting for automatic retries if the job fails
        backoff: { type: 'exponential', delay: 3000 },
      },
    });
    this.queueScheduler = new QueueScheduler('exchange', {
      connection: this.redisConnection as any,
    });
    const queueEvents = new QueueEvents('exchange', {
      connection: this.redisConnection as any,
    });

    // this.addFetchingDataJob();

    queueEvents.on('completed', ({ jobId }) => {
      this.logger.debug('success', 'Job completed', { jobId });
    });

    queueEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      this.logger.debug('error', 'Job failed', { jobId, failedReason });
    });
  }
  // workerProcessor(job: Job<ExchangeJobData>): Promise<void> {
  //   const { name } = job;
  //   this.logger.debug('info', `[workerProcessor]`, { name, data: job.data });
  //   return this.jobs[name as keyof typeof this.jobs]?.call(this, {}) || this.jobs.default();
  // }
  // /**
  //  * Initialize Worker listeners
  //  * @private
  //  */
  // private initWorkerListeners(worker: Worker) {
  //   // Completed
  //   worker.on('completed', (job: Job<ExchangeJobData>) => {
  //     this.logger.debug('success', '[job:completed]', { id: job.id });
  //   });
  //   // Failed
  //   worker.on('failed', (job: Job<ExchangeJobData>, error: Error) => {
  //     this.logger.error('error', '[job:error]', { jobId: job.id, error });
  //   });
  // }
  // /**
  //  * @description add job to queue
  //  */
  // addJob({
  //   name,
  //   payload = {},
  //   options = {
  //     repeat: {
  //       every: +FETCH_MARKET_DATA_INTERVAL,
  //     },
  //   },
  // }: {
  //   name: ExchangeJobNames;
  //   payload?: any;
  //   options?: JobsOptions;
  // }) {
  //   this.queue
  //     .add(name, payload, options)
  //     .then((job) => this.logger.debug(`success`, `[addJob:success]`, { id: job.id, payload }))
  //     .catch((err) => this.logger.error('error', `[addJob:error]`, err, payload));
  // }
  // /**
  //  *  @description init BullMQ Worker
  //  */
  // private initWorker() {
  //   this.worker = new Worker('exchange', this.workerProcessor.bind(this), {
  //     connection: this.redisConnection as any,
  //     concurrency: 20,
  //     limiter: {
  //       max: 1,
  //       duration: FETCH_MARKET_DATA_DURATION,
  //     },
  //   });
  //   this.initWorkerListeners(this.worker);
  // }
  async fetchExchangeInfo({
    page = 1,
    per_page = CoinMarketCapAPI.exchange.LIMIT,
    delay = 300,
    params = {},
  }: {
    page?: number;
    per_page?: number;
    delay?: number;
    params?: any;
  } = {}) {
    const {
      data: { data: exchangeMap },
    } = await CoinMarketCapAPI.fetchCoinMarketCapAPI({
      endpoint: CoinMarketCapAPI.exchange.info,
      params,
    });
    this.logger.debug('info', 'fetchExchangeInfo', { exchangeMap });
  }

  async fetchExchangeMap({
    page = 1,
    per_page = CoinMarketCapAPI.exchange.LIMIT,
    delay = 300,
    params = {},
  }: {
    page?: number;
    per_page?: number;
    delay?: number;
    params?: any;
  } = {}) {
    const {
      data: { data: exchangeMap = [] },
    } = await CoinMarketCapAPI.fetchCoinMarketCapAPI({
      endpoint: CoinMarketCapAPI.exchange.map,
      params,
    });
    this.logger.debug('info', 'fetchExchangeInfo', { exchangeMap });
    return exchangeMap;
  }
  // fetchExchangeData() {}
}
