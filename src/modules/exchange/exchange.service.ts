import Container, { Inject, Service, Token } from 'typedi';
import Logger from '@/core/logger';
import { toOutPut, toPagingOutput } from '@/utils/common';
import AuthSessionModel from '@/modules/auth/authSession.model';
import AuthService from '../auth/auth.service';
import { $pagination, $toMongoFilter, $keysToProject } from '@/utils/mongoDB';
import { _exchange, exchangeModelToken } from '.';
import { assetSortBy, BaseServiceInput, BaseServiceOutput, exchangeSortBy, PRIVATE_KEYS } from '@/types/Common';
import { chunk, isNil, omit } from 'lodash';
import IORedis from 'ioredis';
import { Job, JobsOptions, Queue, QueueEvents, QueueScheduler, Worker } from 'bullmq';
import { DIRedisConnection } from '@/loaders/redisClientLoader';
import { SystemError } from '@/core/errors';
import { CoinMarketCapAPI } from '@/common/api';
import { ExchangeJobData, ExchangeJobNames } from './exchange.job';
import { env } from 'process';
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

  readonly model = Container.get(exchangeModelToken);

  private readonly redisConnection: IORedis.Redis = Container.get(DIRedisConnection);

  private worker: Worker;

  private queue: Queue;

  private queueScheduler: QueueScheduler;

  private readonly jobs: {
    [key in ExchangeJobNames | 'default']?: () => Promise<void>;
  } = {
    'exchange:fetch:data': this.fetchExchangeData,
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
    return [
      'id',
      'avatar',
      'slug',
      // 'categories',
      // 'description',
      'short_description',
      'name',
      'author',
      'market_data',
      'launched',
    ];
  }
  get transKeys() {
    return ['description', 'short_description'];
  }
  constructor() {
    // this.fetchExchangeData();
    if (env.MODE === 'production') {
      // Init Worker
      this.initWorker();
      // Init Queue
      this.initQueue();
    }
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
      this.model.update($toMongoFilter({ _id }), {
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
  async query({ _filter, _query, _permission = 'public' }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { lang, categories = [], deleted = false } = _filter;
      const { offset = 1, limit, sort_by: _sort_by, sort_order, keyword } = _query;
      const sort_by = exchangeSortBy[_sort_by as keyof typeof exchangeSortBy] || exchangeSortBy['created_at'];

      const [
        {
          paging: [{ total_count }],
          items,
        },
      ] = await this.model
        .get(
          $pagination({
            $match: {
              ...((_permission === 'private' && {
                deleted,
              }) || {
                deleted: { $ne: true },
              }),
              ...(keyword && {
                name: { $regex: keyword, $options: 'i' },
              }),
              ...(categories.length && {
                $or: [
                  {
                    categories: {
                      $in: categories,
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
            ...(limit && offset && { items: [{ $skip: +offset }, { $limit: +limit }] }),
          }),
        )
        .toArray();

      this.logger.debug(
        'query_success',
        { _filter, _query },
        sort_by && sort_order && { $sort: { [sort_by]: sort_order == 'asc' ? 1 : -1 } },
      );
      return toPagingOutput({
        items,
        total_count,
        has_next: total_count > offset + limit,
        keys: _permission == 'private' ? this.outputKeys : this.publicOutputKeys,
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
          this.model.$sets.author,
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
          this.model.$sets.author,
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
      const { lang } = _filter;
      const { offset = 1, limit = 10, sort_by, sort_order, keyword } = _query;
      const [
        {
          paging: [{ total_count }],
          items,
        },
      ] = await this.model
        .get([
          ...$pagination({
            $match: {
              deleted: { $ne: true },
              ...(keyword && {
                $or: [
                  { $text: { $search: keyword } },
                  {
                    name: { $regex: keyword, $options: 'i' },
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
            ...(limit && offset && { items: [{ $skip: +offset }, { $limit: +limit }] }),
          }),
        ])
        .toArray();
      this.logger.debug('query_success', { total_count, items });
      return toPagingOutput({
        items,
        total_count,
        has_next: total_count > offset + limit,
        keys: this.publicOutputKeys,
      });
    } catch (err) {
      this.logger.error('query_error', err.message);
      throw err;
    }
  }
  /**
   *  @description init BullMQ Queue
   */
  private initQueue() {
    this.queue = new Queue('exchange', {
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
      name: 'exchange:fetch:data',
      payload: {},
      options: {
        repeat: {
          // pattern: CoinMarketCapAPI.exchange.INTERVAL,
          pattern: '* 0 0 * * *',
        },
        jobId: 'exchange:fetch:data',
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
        pattern: CoinMarketCapAPI.exchange.INTERVAL,
      },
    },
  }: {
    name: ExchangeJobNames;
    payload?: any;
    options?: JobsOptions;
  }) {
    this.queue
      .add(name, payload, options)
      .then((job) => this.logger.debug(`success`, `[addJob:success]`, { id: job.id, payload }))
      .catch((err) => this.logger.error('error', `[addJob:error]`, err, payload));
  }
  /**
   *  @description init BullMQ Worker
   */
  private initWorker() {
    this.worker = new Worker('exchange', this.workerProcessor.bind(this), {
      connection: this.redisConnection as any,
      lockDuration: 1000 * 60 * 5,
      concurrency: 20,
      limiter: {
        max: 1,
        duration: CoinMarketCapAPI.exchange.DURATION,
      },
    });
    this.initWorkerListeners(this.worker);
  }
  /**
   * Initialize Worker listeners
   * @private
   */
  private initWorkerListeners(worker: Worker) {
    // Completed
    worker.on('completed', (job: Job<ExchangeJobData>) => {
      this.logger.debug('success', '[job:exchange:completed]', { id: job.id, jobName: job.name, data: job.data });
    });
    // Failed
    worker.on('failed', (job: Job<ExchangeJobData>, error: Error) => {
      this.logger.error('error', '[job:exchange:error]', { jobId: job.id, error, jobName: job.name, data: job.data });
    });
  }
  workerProcessor({ name, data }: Job<ExchangeJobData>): Promise<void> {
    this.logger.debug('info', `[workerProcessor]`, { name, data });
    return this.jobs[name as keyof typeof this.jobs]?.call(this, {}) || this.jobs.default();
  }
  /**
   *  @description fetch all exchanges from CoinMarketCap
   */
  async fetchExchangeData() {
    this.logger.debug('info', 'fetchExchangeData', { start: new Date() });
    const exchangeMap = (await this.fetchExchangeMap()) || [];
    const groupExchangeMap = chunk(exchangeMap, CoinMarketCapAPI.exchange.LIMIT);
    const exchangeData = await Promise.all(
      groupExchangeMap.map(async (groupExchangeMap) => {
        const exchangeIds = groupExchangeMap.map((exchange: any) => exchange.id);
        const {
          data: { data: exchangeData },
        } = await CoinMarketCapAPI.fetch({
          endpoint: CoinMarketCapAPI.exchange.info,
          params: {
            id: exchangeIds.join(','),
            aux: 'urls,logo,description,date_launched,notice,status',
          },
        });
        return exchangeData;
      }),
    );
    // this.logger.debug('info', 'fetchExchangeData', JSON.stringify(exchangeData));
    for (const _exchange of exchangeData) {
      for (const exchange of Object.values(_exchange)) {
        await this.upsertExchange(exchange);
      }
    }
    this.logger.debug('success', 'fetchExchangeData', { end: new Date() });
  }
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
    } = await CoinMarketCapAPI.fetch({
      endpoint: CoinMarketCapAPI.exchange.info,
      params,
    });
    this.logger.debug('info', 'fetchExchangeInfo', { exchangeMap });
  }

  async fetchExchangeMap({
    page = 1,
    per_page = CoinMarketCapAPI.exchange.LIMIT,
    delay = 300,
    params = {
      aux: 'first_historical_data,last_historical_data,is_active,status',
    },
  }: {
    page?: number;
    per_page?: number;
    delay?: number;
    params?: any;
  } = {}) {
    const {
      data: { data: exchangeMap = [] },
    } = await CoinMarketCapAPI.fetch({
      endpoint: CoinMarketCapAPI.exchange.map,
      params,
    });
    this.logger.debug('info', 'fetchExchangeInfo', { exchangeMap });
    return exchangeMap;
  }
  async upsertExchange({
    id,
    name,
    slug,
    logo: avatar,
    description,
    date_launched: launched,
    notice,
    countries,
    fiats,
    type,
    maker_fee,
    taker_fee,
    weekly_visits,
    spot_volume_usd,
    spot_volume_last_updated,
    urls,
    status,
  }: any) {
    const {
      value,
      ok,
      lastErrorObject: { updatedExisting },
    } = await this.model._collection.findOneAndUpdate(
      { slug: slug },
      {
        $set: {
          name,
          slug,
          avatar,
          description,
          launched,
          fiats,
          notice,
          countries,
          type,
          weekly_visits,
          urls,
          status,
          'market_data.USD.maker_fee': maker_fee,
          'market_data.USD.taker_fee': taker_fee,
          'market_data.USD.spot_volume_usd': spot_volume_usd,
          'market_data.USD.spot_volume_last_updated': spot_volume_last_updated,
          updated_at: new Date(),
          updated_by: 'system',
        },
      },
      {
        upsert: false,
      },
    );
    if (ok && !updatedExisting) {
      await this.model._collection.findOneAndUpdate(
        { slug },
        {
          $setOnInsert: {
            name,
            slug,
            avatar,
            description,
            launched,
            fiats,
            notice,
            countries,
            type,
            weekly_visits,
            urls,
            status,
            'market_data.USD.maker_fee': maker_fee,
            'market_data.USD.taker_fee': taker_fee,
            'market_data.USD.spot_volume_usd': spot_volume_usd,
            'market_data.USD.spot_volume_last_updated': spot_volume_last_updated,
            trans: [],
            categories: [],
            created_at: new Date(),
            updated_at: new Date(),
            created_by: 'system',
          },
        },
        {
          upsert: true,
        },
      );
    }
  }
}
