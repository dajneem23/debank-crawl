import Container, { Service, Token } from 'typedi';
import Logger from '@/core/logger';
import { sleep, throwErr, toOutPut, toPagingOutput } from '@/utils/common';
import { alphabetSize12 } from '@/utils/randomString';
import { $toObjectId, $pagination, $toMongoFilter, $keysToProject } from '@/utils/mongoDB';
import { CoinError, coinErrors, CoinModel, coinModelToken } from '.';
import { BaseServiceInput, BaseServiceOutput, coinSortBy, PRIVATE_KEYS, RemoveSlugPattern } from '@/types/Common';
import { isNil, omit } from 'lodash';
import { _coin } from '@/modules';
import { env } from 'process';
import slugify from 'slugify';
import { FETCH_MARKET_DATA_DURATION, PRICE_STACK_SIZE } from './coin.constants';
import { Job, JobsOptions, Queue, QueueEvents, QueueScheduler, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { SystemError } from '@/core/errors';
import { CoinJobData, CoinJobNames } from './coin.job';
import { CoinMarketCapAPI } from '@/common/api';
import { DIRedisConnection } from '@/loaders/redisClientLoader';
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

  private readonly redisConnection: IORedis.Redis = Container.get(DIRedisConnection);

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
          every: +CoinMarketCapAPI.cryptocurrency.INTERVAL,
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
          ..._coin,
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
   * @returns {Promise<Coin>}
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
        q,
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
      } = _filter;
      const { page = 1, per_page, sort_by: _sort_by, sort_order } = _query;
      const sort_by = coinSortBy[_sort_by as keyof typeof coinSortBy] || coinSortBy['created_at'];
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
              'market_data.USD.fully_diluted_market_cap': fully_diluted_market_cap,
              'market_data.USD.tvl': tvl,
              'market_data.USD.last_updated': last_updated,
              'market_data.USD.volume_24h_reported': volume_24h_reported,
              'market_data.USD.volume_7d_reported': volume_7d_reported,
              'market_data.USD.volume_30d_reported': volume_30d_reported,
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
   * @description fetch OHLCV from coinmarketcap api
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

  /**
   * Initialize Worker listeners
   * @private
   */
  private initWorkerListeners(worker: Worker) {
    // Completed
    worker.on('completed', (job: Job<CoinJobData>) => {
      this.logger.debug('success', '[job:coin:completed]', { id: job.id, jobName: job.name, data: job.data });
    });
    // Failed
    worker.on('failed', (job: Job<CoinJobData>, error: Error) => {
      this.logger.error('error', '[job:coin:error]', { jobId: job.id, error, jobName: job.name, data: job.data });
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
