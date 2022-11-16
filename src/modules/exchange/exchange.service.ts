import Container from 'typedi';
import Logger from '@/core/logger';
import { _exchange, exchangeModelToken } from '.';
import { chunk } from 'lodash';
import IORedis from 'ioredis';
import { Job, JobsOptions, MetricsTime, Queue, QueueEvents, Worker } from 'bullmq';
import { DIRedisConnection } from '@/loaders/redisClientLoader';
import { CoinMarketCapAPI } from '@/common/api';
import { ExchangeJobData, ExchangeJobNames } from './exchange.job';
import { env } from 'process';

export class ExchangeService {
  private logger = new Logger('ExchangeService');

  readonly model = Container.get(exchangeModelToken);

  private readonly redisConnection = Container.get(DIRedisConnection);

  private worker: Worker;

  private queue: Queue;

  // private queueScheduler: QueueScheduler;

  private readonly jobs: {
    [key in ExchangeJobNames | 'default']?: () => Promise<void>;
  } = {
    'exchange:fetch:data': this.fetchExchangeData,
    default: () => {
      throw new Error('Invalid job name');
    },
  };

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
   *  @description init BullMQ Queue
   */
  private initQueue() {
    this.queue = new Queue('exchange', {
      connection: this.redisConnection,
      defaultJobOptions: {
        // The total number of attempts to try the job until it completes
        attempts: 3,
        // Backoff setting for automatic retries if the job fails
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: true,
        removeOnFail: true,
      },
    });
    // this.queueScheduler = new QueueScheduler('exchange', {
    //   connection: this.redisConnection,
    // });
    const queueEvents = new QueueEvents('exchange', {
      connection: this.redisConnection,
    });

    this.initRepeatJobs();

    // queueEvents.on('completed', ({ jobId }) => {
    //   this.logger.debug('success', 'Job completed', { jobId });
    // });

    queueEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      this.logger.discord('error', 'exchange:Job failed', { jobId, failedReason });
    });
  }

  private initRepeatJobs() {
    this.addJob({
      name: 'exchange:fetch:data',
      payload: {},
      options: {
        repeatJobKey: 'exchange:fetch:data',
        repeat: {
          // pattern: CoinMarketCapAPI.exchange.INTERVAL,
          pattern: '* 0 0 * * *',
        },
        // jobId: 'exchange:fetch:data',
        removeOnComplete: true,
        removeOnFail: true,
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
      .then((job) => this.logger.debug(`success`, `[addJob:success]`, { id: job.id, name, payload }))
      .catch((err) => this.logger.discord('error', `[addJob:error]`, err, name, JSON.stringify(payload)));
  }
  /**
   *  @description init BullMQ Worker
   */
  private initWorker() {
    this.worker = new Worker('exchange', this.workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 60,
      concurrency: 20,
      limiter: {
        max: 10,
        duration: CoinMarketCapAPI.exchange.DURATION,
      },
      metrics: {
        maxDataPoints: MetricsTime.TWO_WEEKS,
      },
    });
    this.logger.debug('info', '[initWorker:exchange]', 'Worker initialized');
    this.initWorkerListeners(this.worker);
  }
  /**
   * Initialize Worker listeners
   * @private
   */
  private initWorkerListeners(worker: Worker) {
    // Completed
    worker.on('completed', ({ name, id, data }: Job<ExchangeJobData>) => {
      this.logger.discord('success', '[job:exchange:completed]', id, name, JSON.stringify(data));
    });
    // Failed
    worker.on('failed', ({ id, name, data, failedReason }: Job<ExchangeJobData>, error: Error) => {
      this.logger.discord(
        'error',
        '[job:exchange:error]',
        id,
        name,
        failedReason,
        JSON.stringify(data),
        JSON.stringify(error),
      );
    });
  }
  workerProcessor({ name, data }: Job<ExchangeJobData>): Promise<void> {
    // this.logger.debug('info', `[exchange:workerProcessor:run]`, { name, data });
    return this.jobs[name as keyof typeof this.jobs]?.call(this, {}) || this.jobs.default();
  }
  /**
   *  @description fetch all exchanges from CoinMarketCap
   */
  async fetchExchangeData() {
    try {
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
      this.logger.debug('success', 'exchange:fetchExchangeData', { end: new Date() });
    } catch (error) {
      this.logger.discord('error', 'exchange:fetchExchangeData', JSON.stringify(error));
      throw error;
    }
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
    try {
      const {
        data: { data: exchangeMap },
      } = await CoinMarketCapAPI.fetch({
        endpoint: CoinMarketCapAPI.exchange.info,
        params,
      });
      this.logger.debug('info', 'exchange:fetchExchangeInfo', { exchangeMap });
    } catch (error) {
      this.logger.discord('error', 'exchange:fetchExchangeInfo', JSON.stringify(error));
      throw error;
    }
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
    try {
      const {
        data: { data: exchangeMap = [] },
      } = await CoinMarketCapAPI.fetch({
        endpoint: CoinMarketCapAPI.exchange.map,
        params,
      });
      this.logger.debug('info', 'exchange:fetchExchangeInfo', { exchangeMap });
      return exchangeMap;
    } catch (error) {
      this.logger.discord('error', 'exchange:fetchExchangeMap', JSON.stringify(error));
      throw error;
    }
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
    try {
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
    } catch (error) {
      this.logger.discord('error', 'exchange:upsertExchange', JSON.stringify(error));
      throw error;
    }
  }
}
