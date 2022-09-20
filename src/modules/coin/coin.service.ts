import Container, { Service, Token } from 'typedi';
import Logger from '@/core/logger';
import { sleep, throwErr, toOutPut, toPagingOutput } from '@/utils/common';
import { alphabetSize12 } from '@/utils/randomString';
import { $toObjectId, $pagination, $toMongoFilter, $keysToProject } from '@/utils/mongoDB';
import { CoinError, coinErrors, CoinModel, coinModelToken } from '.';
import { BaseServiceInput, BaseServiceOutput, PRIVATE_KEYS } from '@/types/Common';
import { isNil, omit } from 'lodash';
import { _coin } from '@/modules';
import axios from 'axios';
import { CoinMarketCapAPI } from './coinMarketCapAPI';
import { env } from 'process';
import slugify from 'slugify';
import {
  FETCH_MARKET_DATA_DURATION,
  FETCH_MARKET_DATA_INTERVAL,
  PRICE_PRECISION,
  PRICE_STACK_SIZE,
} from './coin.constants';
import { Job, JobsOptions, Queue, QueueEvents, QueueScheduler, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { SystemError } from '@/core/errors';
import { CoinJobData, CoinJobNames } from './coin.job';
const TOKEN_NAME = '_coinService';
/**
 * A bridge allows another service access to the Model layer
 * @export coinServiceToken
 * @class CoinService
 * @extends {BaseService}
 */
export const coinServiceToken = new Token<CoinService>(TOKEN_NAME);

/**
 * @class CoinService
 * @extends  BaseService
 * @description Coin Service for all coin related operations
 */
@Service(coinServiceToken)
export class CoinService {
  private logger = new Logger('CoinService');

  private model = Container.get<CoinModel>(coinModelToken);

  private readonly redisConnection: IORedis.Redis;

  private worker: Worker;

  private queue: Queue;

  private queueScheduler: QueueScheduler;

  private readonly jobs = {
    'coin:fetch:marketData': this.fetchMarketData,
    'coin:fetch:ohlcv': this.fetchOHLCV,
    default: () => {
      throw new SystemError('Invalid job name');
    },
  };

  constructor() {
    if (env.MODE === 'production') {
      // Init Redis connection
      this.redisConnection = new IORedis(env.REDIS_URI, { maxRetriesPerRequest: null, enableReadyCheck: false });
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
    this.worker = new Worker('coin', this.workerProcessor.bind(this), {
      connection: this.redisConnection as any,
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
    this.queue = new Queue('coin', {
      connection: this.redisConnection as any,
      defaultJobOptions: {
        // The total number of attempts to try the job until it completes
        attempts: 5,
        // Backoff setting for automatic retries if the job fails
        backoff: { type: 'exponential', delay: 3000 },
      },
    });
    this.queueScheduler = new QueueScheduler('coin', {
      connection: this.redisConnection as any,
    });
    const queueEvents = new QueueEvents('coin', {
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
      name: 'coin:fetch:marketData',
      payload: {},
      options: {
        repeat: {
          every: +FETCH_MARKET_DATA_INTERVAL,
        },
        jobId: 'coin:fetch:marketData',
      },
    });
  }

  private error(msg: keyof typeof coinErrors) {
    return new CoinError(msg);
  }

  get outputKeys() {
    return this.model._keys;
  }
  get publicOutputKeys() {
    return ['id', 'name', 'token_id', 'about', 'categories', 'avatar'];
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
      const now = new Date();
      const { name } = _content;
      const value = await this.model.create(
        {
          name,
        },
        {
          ..._coin,
          ..._content,
          deleted: false,
          ...(_subject && { created_by: _subject }),
          created_at: now,
          updated_at: now,
        },
        {
          upsert: true,
          returnDocument: 'after',
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
   * @returns {Promise<Coin>}
   */
  async update({ _id, _content, _subject }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const now = new Date();
      const value = await this.model.update(
        $toMongoFilter({ _id }),
        {
          $set: {
            ..._content,
            ...(_subject && { updated_by: _subject }),
            updated_at: now,
          },
        },
        {
          upsert: false,
          returnDocument: 'after',
        },
      );
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
      const now = new Date();
      await this.model.delete(
        $toMongoFilter({ _id }),
        {
          deleted: true,
          ...(_subject && { deleted_by: _subject }),
          deleted_at: now,
        },
        {
          upsert: false,
          returnDocument: 'after',
        },
      );
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
      const { lang, q, category } = _filter;
      const { page = 1, per_page, sort_by, sort_order } = _query;
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model
        .get(
          $pagination({
            $match: {
              $and: [
                {
                  deleted: false,
                  ...(lang && {
                    'trans.lang': { $eq: lang },
                  }),
                },
              ],
              ...(q && {
                $or: [
                  { name: { $regex: q, $options: 'i' } },
                  { token_id: { $regex: q, $options: 'i' } },
                  { unique_key: { $regex: q, $options: 'i' } },
                ],
              }),
              ...(category && {
                $or: [
                  { categories: { $in: Array.isArray(category) ? $toObjectId(category) : $toObjectId([category]) } },
                ],
              }),
            },
            $lookups: [this.model.$lookups.categories],
            $projects: [
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
            ],
            $more: [
              this.model.$sets.trans,
              {
                $project: {
                  ...$keysToProject(this.outputKeys),
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
          this.model.$lookups.categories,
          this.model.$lookups.author,
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
          this.model.$sets.trans,
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
          this.model.$lookups.categories,
          this.model.$lookups.author,
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
          this.model.$sets.trans,
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
  async search({ _filter, _query }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { q, lang } = _filter;
      const { page = 1, per_page = 10, sort_by, sort_order } = _query;
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
              ...(q && {
                $or: [{ $text: { $search: q } }, { name: { $regex: q, $options: 'i' } }],
              }),
            },
            $lookups: [this.model.$lookups.categories],
            $projects: [
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
            ],
            $more: [
              this.model.$sets.trans,
              {
                $project: {
                  ...$keysToProject(this.outputKeys),
                  ...(lang && $keysToProject(this.transKeys, '$trans')),
                },
              },
            ],
            ...(per_page && page && { items: [{ $skip: +per_page * (+page - 1) }, { $limit: +per_page }] }),
          }),
        ])
        .toArray();
      this.logger.debug('query_success', { total_count, items });
      return omit(toPagingOutput({ items, total_count, keys: this.publicOutputKeys }));
    } catch (err) {
      this.logger.error('query_error', err.message);
      throw err;
    }
  }
  /**
   *
   * @description fetch market data from coinmarketcap api
   */
  async fetchMarketData({
    page = 1,
    per_page = CoinMarketCapAPI.SYMBOL_LIMIT,
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
        } = await this.getCoinMarketCapAPI({
          endpoint: 'quotesLatest',
          params: {
            symbol: listSymbol.join(','),
          },
        });
        for (const symbol of Object.keys(quotesLatest)) {
          for (const item of quotesLatest[symbol]) {
            const {
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
                  tvl,
                  last_updated,
                },
              },
              name,
            } = item;
            const marketData = {
              'market_data.USD.price': price,
              'market_data.USD.volume_24h': volume_24h,
              'market_data.USD.volume_change_24h': volume_change_24h,
              'market_data.USD.percent_change_1h': percent_change_1h,
              'market_data.USD.percent_change_24h': percent_change_24h,
              'market_data.USD.percent_change_7d': percent_change_7d,
              'market_data.USD.percent_change_30d': percent_change_30d,
              'market_data.USD.percent_change_60d': percent_change_60d,
              'market_data.USD.percent_change_90d': percent_change_90d,
              'market_data.USD.market_cap': market_cap,
              'market_data.USD.market_cap_dominance': market_cap_dominance,
              'market_data.USD.tvl': tvl,
              'market_data.USD.last_updated': last_updated,
            };
            const {
              value,
              ok,
              lastErrorObject: { updatedExisting },
            } = await this.model._collection.findOneAndUpdate(
              {
                name: { $regex: `^${name}$`, $options: 'i' },
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
                        date: new Date(),
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
                        date: new Date(),
                      },
                    ],
                    ...marketData,
                    slug: slugify(name, {
                      trim: true,
                      lower: true,
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
   * @description fetch OHLCV from coinmarketcap api
   */
  async fetchOHLCV({
    page = 1,
    per_page = CoinMarketCapAPI.SYMBOL_LIMIT,
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
        } = await this.getCoinMarketCapAPI({
          endpoint: 'ohlcvLastest',
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
                name: { $regex: `^${name}$`, $options: 'i' },
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
                  name,
                },
                {
                  $setOnInsert: {
                    name,
                    slug: slugify(name, {
                      trim: true,
                      lower: true,
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
                    created_by: 'admin',
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
  getCoinMarketCapAPI({
    params = {},
    endpoint,
  }: {
    endpoint: keyof typeof CoinMarketCapAPI.cryptocurrency;
    params?: any;
  }): Promise<any> {
    return axios.get(`${CoinMarketCapAPI.HOST}${CoinMarketCapAPI.cryptocurrency[endpoint]}`, {
      params,
      headers: {
        'X-CMC_PRO_API_KEY': env.COINMARKETCAP_API_KEY,
      },
    });
  }

  /**
   * Initialize Worker listeners
   * @private
   */
  private initWorkerListeners(worker: Worker) {
    // Completed
    worker.on('completed', (job: Job<CoinJobData>) => {
      this.logger.debug('success', '[job:completed]', { id: job.id });
    });
    // Failed
    worker.on('failed', (job: Job<CoinJobData>, error: Error) => {
      this.logger.error('error', '[job:error]', { jobId: job.id, error });
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
        every: +FETCH_MARKET_DATA_INTERVAL,
      },
    },
  }: {
    name: CoinJobNames;
    payload?: any;
    options?: JobsOptions;
  }) {
    this.queue
      .add(name, payload, options)
      .then((job) => this.logger.debug(`success`, `[addJob:success]`, { id: job.id, payload }))
      .catch((err) => this.logger.error('error', `[addJob:error]`, err, payload));
  }
  workerProcessor(job: Job<CoinJobData>): Promise<void> {
    const { name } = job;
    this.logger.debug('info', `[workerProcessor]`, { name, data: job.data });
    return this.jobs[name as keyof typeof this.jobs]?.call(this, {}) || this.jobs.default();
  }
}
