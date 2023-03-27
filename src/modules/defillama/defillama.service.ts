import Container from 'typedi';
import Logger from '@/core/logger';
import { pgPoolToken } from '@/loaders/pg.loader';
import { Job, JobsOptions, MetricsTime, Queue, QueueEvents, Worker } from 'bullmq';
import { env, exit } from 'process';
import { DIRedisConnection } from '@/loaders/redis.loader';

import { DefillamaJobData, DefillamaJobNames } from './defillama.job';
import { DefillamaAPI } from '@/common/api';
import {
  defillamaTvlChainModelToken,
  defillamaTvlChartModelToken,
  defillamaTvlProtocolModelToken,
} from './defillama.model';
import { getCoinsCurrentPrice, getCoinsHistorical, updateCoinsHistoricalKeyCache } from './defillama.func';
import { MongoClient } from 'mongodb';
import { DIMongoClient } from '@/loaders/mongoDB.loader';
import { createArrayDateByHours, daysDiff } from '@/utils/date';
import { getMgOnChainDbName } from '@/common/db';
import { DIDiscordClient } from '@/loaders/discord.loader';
import Bluebird from 'bluebird';
import { chunk, uniq } from 'lodash';
import { CHAINS } from '@/types/chain';
import { getRedisKeys, setExpireRedisKey } from '@/service/redis/func';
import { workerProcessor } from './defiilama.process';
import { getTokenOnRedis } from '@/service/token/func';
const pgPool = Container.get(pgPoolToken);

export class DefillamaService {
  private logger = new Logger('Defillama');

  private readonly redisConnection = Container.get(DIRedisConnection);

  private readonly defillamaTvlProtocolModel = Container.get(defillamaTvlProtocolModelToken);

  private readonly defillamaTvlChartModel = Container.get(defillamaTvlChartModelToken);

  private readonly defillamaTvlChainModel = Container.get(defillamaTvlChainModelToken);

  private worker: Worker;

  private workerOnchain: Worker;

  private workerToken: Worker;

  private workerPool: Worker;

  private workerPrice: Worker;

  private queue: Queue;

  private queueOnchain: Queue;

  private queueToken: Queue;

  private queuePool: Queue;

  private queuePrice: Queue;

  private mgClient: MongoClient = Container.get(DIMongoClient);

  private readonly jobs: {
    [key in DefillamaJobNames | 'default']?: (params?: any) => Promise<void>;
  } = {
    'defillama:fetch:tvl:protocols': this.fetchTVLProtocols,
    'defillama:add:tvl:protocol:details': this.addFetchTVLProtocolDetails,
    'defillama:fetch:tvl:protocol:detail': this.fetchTVLProtocolDetail,
    'defillama:fetch:tvl:charts': this.fetchTVLCharts,
    'defillama:fetch:tvl:chains': this.fetchTVLChains,
    'defillama:add:tvl:charts:chains': this.addFetchTvlChartsChainsJob,
    'defillama:fetch:tvl:charts:chain': this.fetchTVLChartChain,
    'defillama:add:tvl:protocol:tvl': this.addFetchTVLProtocolTVLJob,
    'defillama:fetch:tvl:protocol:tvl': this.fetchTVLProtocolTVL,
    'defillama:fetch:coin:historical:data:id:timestamp': this.fetchCoinsHistoricalData,
    'defillama:add:fetch:coin:historical': this.addFetchCoinsHistoricalDataJob,
    'defillama:update:usd:value:of:transaction': this.updateUsdValueOfTransaction,
    'defillama:add:update:usd:value:of:transaction': this.addUpdateUsdValueOfTransactionsJob,
    'defillama:update:coin:historical:key:cache': updateCoinsHistoricalKeyCache,
    'defillama:update:pool:of:transaction': this.updatePoolOfTransaction,
    'defillama:add:pool:of:transaction': this.addUpdatePoolOfTransactionsJob,
    'defillama:update:coins:current:price': this.updateCoinsCurrentPrice,
    'defillama:add:update:coins:current:price': this.addUpdateCoinsCurrentPriceJob,
    default: () => {
      throw new Error('Invalid job name');
    },
  };

  constructor() {
    // TODO: CHANGE THIS TO PRODUCTION
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
    this.worker = new Worker('defillama', workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 60 * 5,
      concurrency: 100,
      stalledInterval: 1000 * 15,
      skipLockRenewal: true,
      maxStalledCount: 5,
      // limiter: {
      //   max: 200,
      //   duration: 60 * 1000,
      // },
      metrics: {
        maxDataPoints: MetricsTime.TWO_WEEKS,
      },
    });
    this.initWorkerListeners(this.worker);

    this.workerOnchain = new Worker('defillama-onchain', workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 30,
      skipLockRenewal: true,
      stalledInterval: 1000 * 15,
      concurrency: 500,
      // limiter: {
      //   max: 200,
      //   duration: 60 * 1000,
      // },
      maxStalledCount: 5,
      metrics: {
        maxDataPoints: MetricsTime.TWO_WEEKS,
      },
    });
    this.initWorkerListeners(this.workerOnchain);
    this.workerOnchain.on('completed', async (job) => {
      const discord = Container.get(DIDiscordClient);

      await discord.sendMsg({
        message: `Onchain job completed: ${job.id}`,
        channelId: '1041620555188682793',
      });
    });

    this.workerToken = new Worker('defillama-token', workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 30,
      stalledInterval: 1000 * 15,
      skipLockRenewal: true,
      concurrency: 25,
      // limiter: {
      //   max: 600,
      //   duration: 60 * 1000,
      // },
      maxStalledCount: 5,
      metrics: {
        maxDataPoints: MetricsTime.TWO_WEEKS,
      },
    });
    this.initWorkerListeners(this.workerToken);

    this.workerPool = new Worker('defillama-pool', workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 60,
      skipLockRenewal: true,
      concurrency: 20,
      // limiter: {
      //   max: 600,
      //   duration: 60 * 1000,
      // },
      maxStalledCount: 5,
      metrics: {
        maxDataPoints: MetricsTime.TWO_WEEKS,
      },
    });
    this.initWorkerListeners(this.workerPool);

    this.workerPrice = new Worker('defillama-price', workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 30,
      skipLockRenewal: true,
      concurrency: 20,
      // limiter: {
      //   max: 600,
      //   duration: 60 * 1000,
      // },
      maxStalledCount: 5,
      metrics: {
        maxDataPoints: MetricsTime.TWO_WEEKS,
      },
    });
    this.initWorkerListeners(this.workerPrice);
    this.logger.debug('info', '[initWorker:defillama]', 'Worker initialized');
  }
  /**
   *  @description init BullMQ Queue
   */
  private initQueue() {
    this.queue = new Queue('defillama', {
      connection: this.redisConnection,
      defaultJobOptions: {
        // The total number of attempts to try the job until it completes
        attempts: 5,
        // Backoff setting for automatic retries if the job fails
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: true,
        removeOnFail: true,
      },
    });

    const queueEvents = new QueueEvents('defillama', {
      connection: this.redisConnection,
    });

    queueEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      this.logger.debug('error', ':defillamaJob failed', { jobId, failedReason });
    });

    this.queueOnchain = new Queue('defillama-onchain', {
      connection: this.redisConnection,
      defaultJobOptions: {
        // The total number of attempts to try the job until it completes
        attempts: 5,
        // Backoff setting for automatic retries if the job fails
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: true,
        removeOnFail: true,
      },
    });
    const queueOnchainEvents = new QueueEvents('defillama-onchain', {
      connection: this.redisConnection,
    });

    queueOnchainEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      this.logger.debug('error', ':defillamaJob failed', { jobId, failedReason });
    });

    this.queueToken = new Queue('defillama-token', {
      connection: this.redisConnection,
      defaultJobOptions: {
        // The total number of attempts to try the job until it completes
        attempts: 5,
        // Backoff setting for automatic retries if the job fails
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: true,
        removeOnFail: true,
      },
    });
    const queueTokenEvents = new QueueEvents('defillama-token', {
      connection: this.redisConnection,
    });

    queueTokenEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      this.logger.debug('error', ':defillamaJob failed', { jobId, failedReason });
    });

    this.queuePool = new Queue('defillama-pool', {
      connection: this.redisConnection,
      defaultJobOptions: {
        // The total number of attempts to try the job until it completes
        attempts: 5,
        // Backoff setting for automatic retries if the job fails
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: true,
        removeOnFail: true,
      },
    });
    const queuePoolEvents = new QueueEvents('defillama-pool', {
      connection: this.redisConnection,
    });

    queuePoolEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      this.logger.debug('error', ':defillamaJob failed', { jobId, failedReason });
    });

    this.queuePrice = new Queue('defillama-price', {
      connection: this.redisConnection,
      defaultJobOptions: {
        // The total number of attempts to try the job until it completes
        attempts: 5,
        // Backoff setting for automatic retries if the job fails
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: true,
        removeOnFail: true,
      },
    });
    const queuePriceEvents = new QueueEvents('defillama-price', {
      connection: this.redisConnection,
    });

    queuePriceEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      this.logger.debug('error', ':defillamaJob failed', { jobId, failedReason });
    });
    this.initRepeatJobs();

    // this.addUpdateUsdValueOfTransactionsJob();
    // TODO: REMOVE THIS LATER
    // this.addFetchTVLProtocolTVLJob();
    // this.queue.getJobCounts().then((res) => console.log(res));
  }
  private initRepeatJobs() {
    // this.addJob({
    //   name: 'defillama:fetch:tvl:protocols',
    //   options: {
    //     repeatJobKey: 'defillama:fetch:tvl:protocols',
    //     repeat: {
    //       pattern: '* 0 0 * * *',
    //     },
    //     removeOnComplete: true,
    //     removeOnFail: true,
    //   },
    // });
    // this.addJob({
    //   name: 'defillama:fetch:tvl:charts',
    //   options: {
    //     repeatJobKey: 'defillama:fetch:tvl:charts',
    //     repeat: {
    //       pattern: '* 0 0 * * *',
    //     },
    //     removeOnComplete: true,
    //     removeOnFail: true,
    //   },
    // });
    // this.addJob({
    //   name: 'defillama:fetch:tvl:chains',
    //   options: {
    //     repeatJobKey: 'defillama:fetch:tvl:chains',
    //     repeat: {
    //       pattern: '* 0 0 * * *',
    //     },
    //     removeOnComplete: true,
    //     removeOnFail: true,
    //   },
    // });
    // this.addJob({
    //   name: 'defillama:add:tvl:protocol:details',
    //   options: {
    //     repeatJobKey: 'defillama:add:tvl:protocol:details',
    //     repeat: {
    //       pattern: '* 0 0 * * *',
    //     },
    //     removeOnComplete: true,
    //     removeOnFail: true,
    //   },
    // });
    // this.addJob({
    //   name: 'defillama:add:tvl:charts:chains',
    //   options: {
    //     repeatJobKey: 'defillama:add:tvl:charts:chains',
    //     repeat: {
    //       pattern: '* 0 0 * * *',
    //     },
    //     removeOnComplete: true,
    //     removeOnFail: true,
    //   },
    // });
    // this.addJob({
    //   name: 'defillama:add:tvl:protocol:tvl',
    //   options: {
    //     repeatJobKey: 'defillama:add:tvl:protocol:tvl',
    //     repeat: {
    //       pattern: '* 0 0 * * *',
    //     },
    //     removeOnComplete: true,
    //     removeOnFail: true,
    //   },
    // });
    //TODO: FIX THIS
    // this.queue.add(
    //   'defillama:add:fetch:coin:historical',
    //   {},
    //   {
    //     repeatJobKey: 'defillama:add:fetch:coin:historical',
    //     jobId: 'defillama:add:fetch:coin:historical',
    //     repeat: {
    //       every: 1000 * 60 * 60,
    //     },
    //     removeOnComplete: true,
    //     removeOnFail: true,
    //     priority: 1,
    //     attempts: 5,
    //   },
    // );
    this.queue.add(
      'defillama:add:update:usd:value:of:transaction',
      {},
      {
        repeatJobKey: 'defillama:add:update:usd:value:of:transaction',
        jobId: 'defillama:add:update:usd:value:of:transaction',
        repeat: {
          every: 1000 * 60 * 15,
        },
        removeOnComplete: true,
        removeOnFail: false,
        priority: 1,
        attempts: 5,
      },
    );
    //!fixing
    //TODO: fix this
    // this.queue.add(
    //   'defillama:add:pool:of:transaction',
    //   {},
    //   {
    //     repeatJobKey: 'defillama:add:pool:of:transaction',
    //     jobId: 'defillama:add:pool:of:transaction',
    //     repeat: {
    //       every: 1000 * 60 * 60,
    //     },
    //     removeOnComplete: true,
    //     removeOnFail: false,
    //     priority: 1,
    //     attempts: 5,
    //   },
    // );

    this.queue.add(
      'defillama:add:update:coins:current:price',
      {},
      {
        repeatJobKey: 'defillama:add:update:coins:current:price',
        jobId: 'defillama:add:update:coins:current:price',
        repeat: {
          every: 1000 * 60 * 2.5,
        },
        removeOnComplete: true,
        removeOnFail: false,
        priority: 1,
        attempts: 5,
      },
    );

    // this.queue.add(
    //   'defillama:update:coin:historical:key:cache',
    //   {},
    //   {
    //     repeatJobKey: 'defillama:update:coin:historical:key:cache',
    //     jobId: 'defillama:update:coin:historical:key:cache',
    //     repeat: {
    //       every: 1000 * 60 * 30,
    //     },
    //     removeOnComplete: true,
    //     removeOnFail: false,
    //     priority: 1,
    //     attempts: 5,
    //   },
    // );
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
      removeOnComplete: true,
    },
  }: {
    name: DefillamaJobNames;
    payload?: any;
    options?: JobsOptions;
  }) {
    this.queue.add(name, payload, options);
  }
  /**
   * Initialize Worker listeners
   * @private
   */
  private initWorkerListeners(worker: Worker) {
    // Completed
    // worker.on('completed', ({ id, data, name }: Job<DefillamaJobData>) => {
    //   this.logger.discord('success', '[job:defillama:completed]', id, name, JSON.stringify(data));
    // });
    // Failed
    worker.on('failed', ({ id, name, data, failedReason }: Job<DefillamaJobData>, error: Error) => {
      this.logger.discord(
        'error',
        '[job:defillama:error]',
        id,
        name,
        failedReason,
        JSON.stringify(data),
        JSON.stringify(error),
      );
    });
  }
  async fetchTVLProtocols() {
    try {
      const { data } = await DefillamaAPI.fetch({
        endpoint: DefillamaAPI.Tvl.protocols.list.endpoint,
        params: {},
      });
      this.logger.debug('info', `[fetchTVLProtocols]`, { num: data.length });
      for (const protocol of data) {
        await this.insertProtocolToMongoDb(protocol);
      }
      this.logger.debug('success', `[fetchTVLProtocols:DONE]`, { num: data.length });
    } catch (error) {
      this.logger.discord('error', '[fetchTVLProtocols:error]', JSON.stringify(error));
      throw error;
    }
  }
  async insertProtocolToMongoDb(protocol: any) {
    await this.defillamaTvlProtocolModel._collection.findOneAndUpdate(
      {
        slug: protocol.slug,
      },
      {
        $set: {
          ...protocol,
          updated_at: new Date(),
          updated_by: 'system',
        },
        $setOnInsert: {
          created_at: new Date(),
          created_by: 'system',
        },
      },
      {
        upsert: true,
      },
    );
  }

  async insertProtocolToPG(protocol: any) {
    await pgPool.query(
      `
      INSERT INTO defillama_tvl_protocols (
        slug,
        name,
        category,
      `,
    );
  }

  async addFetchTVLProtocolDetails() {
    try {
      const protocols = await this.defillamaTvlProtocolModel._collection.find({}).toArray();
      for (const { slug } of protocols) {
        this.addJob({
          name: 'defillama:fetch:tvl:protocol:detail',
          payload: {
            slug,
          },
          options: {
            jobId: `defillama:fetch:tvl:protocol:detail:${slug}`,
            // delay: 1000 * 60 * 5,
            removeOnComplete: true,
            removeOnFail: true,
          },
        });
      }
    } catch (error) {
      this.logger.discord('error', '[fetchTVLProtocols:error]', JSON.stringify(error));
      throw error;
    }
  }
  async fetchTVLProtocolDetail(
    { slug }: { slug: string } = {
      slug: null,
    },
  ) {
    try {
      if (!slug) {
        throw new Error('fetchTVLProtocolDetail: Invalid slug');
      }
      const {
        data: { id, name, slug: _slug, ...details },
      } = await DefillamaAPI.fetch({
        endpoint: `${DefillamaAPI.Tvl.protocols.detail.endpoint}/${slug}`,
      });
      await this.defillamaTvlProtocolModel._collection.updateOne(
        {
          slug,
        },
        {
          $set: {
            ...details,
            updated_at: new Date(),
            updated_by: 'system',
          },
        },
      );
    } catch (error) {
      this.logger.discord('error', '[fetchTVLProtocols:error]', JSON.stringify(error));
      throw error;
    }
  }
  async fetchTVLCharts() {
    try {
      const { data } = await DefillamaAPI.fetch({
        endpoint: DefillamaAPI.Tvl.charts.list.endpoint,
      });
      this.logger.debug('info', `[fetchTVLCharts]`, { num: data.length });
      await this.defillamaTvlChartModel._collection.insertOne({
        created_at: new Date(),
        created_by: 'system',
        charts: data,
      });
    } catch (error) {
      this.logger.discord('error', '[fetchTVLCharts:error]', JSON.stringify(error));
      throw error;
    }
  }
  async fetchTVLChains() {
    try {
      const { data } = await DefillamaAPI.fetch({
        endpoint: DefillamaAPI.Tvl.chains.list.endpoint,
      });
      this.logger.debug('info', `[fetchTVLChains]`, { num: data.length });
      for (const chain of data) {
        await this.defillamaTvlChainModel._collection.findOneAndUpdate(
          {
            $or: [{ id: chain.chainId }, { gecko_id: chain.gecko_id }],
          },
          {
            $set: {
              ...chain,
              updated_at: new Date(),
              updated_by: 'system',
            },
            $setOnInsert: {
              created_at: new Date(),
              created_by: 'system',
            },
          },
          {
            upsert: true,
          },
        );
      }
    } catch (error) {
      this.logger.discord('error', '[fetchTVLChains:error]', JSON.stringify(error));
      throw error;
    }
  }
  async addFetchTvlChartsChainsJob() {
    try {
      const charts = await this.defillamaTvlChainModel._collection.find({}).toArray();
      for (const { name } of charts) {
        this.addJob({
          name: 'defillama:fetch:tvl:charts:chain',
          payload: {
            name,
          },
          options: {
            // delay: 1000 * 60 * 5,
            removeOnComplete: true,
            removeOnFail: true,
          },
        });
      }
    } catch (error) {
      this.logger.discord('error', '[addFetchTvlChartsChainsJob:error]', JSON.stringify(error));
      throw error;
    }
  }
  async fetchTVLChartChain(
    { name }: { name: string } = {
      name: null,
    },
  ) {
    try {
      if (!name) {
        throw new Error('fetchTVLChartDetail: Invalid slug');
      }
      const { data, status } = await DefillamaAPI.fetch({
        endpoint: `${DefillamaAPI.Tvl.charts.chain.endpoint}/${name}`,
      });
      if (status != 200) {
        this.logger.error('error', '[fetchTVLChartChain:error]', name, status, JSON.stringify(data));
        throw new Error('fetchTVLChartChain: Invalid response');
      }
      await this.defillamaTvlChainModel._collection.updateOne(
        {
          name,
        },
        {
          $set: {
            charts: data,
            updated_at: new Date(),
            updated_by: 'system',
          },
        },
      );
    } catch (error) {
      this.logger.discord('error', '[fetchTVLChartChain:error]', JSON.stringify(error));
      throw error;
    }
  }
  async addFetchTVLProtocolTVLJob() {
    try {
      const protocols = await this.defillamaTvlProtocolModel._collection.find({}).toArray();
      for (const { slug } of protocols) {
        this.addJob({
          name: 'defillama:fetch:tvl:protocol:tvl',
          payload: {
            slug,
          },
          options: {
            // delay: 1000 * 60 * 5,
            removeOnComplete: true,
            removeOnFail: true,
          },
        });
      }
    } catch (error) {
      this.logger.discord('error', '[addFetchTVLProtocolTVLJob:error]', JSON.stringify(error));
      throw error;
    }
  }
  async fetchTVLProtocolTVL(
    { slug }: { slug: string } = {
      slug: null,
    },
  ) {
    try {
      if (!slug) {
        throw new Error('fetchTVLProtocolTVL: Invalid slug');
      }
      const { data, status } = await DefillamaAPI.fetch({
        endpoint: `${DefillamaAPI.Tvl.protocols.tvl.endpoint}/${slug}`,
      });
      if (status != 200) {
        this.logger.discord('error', '[fetchTVLProtocolTVL:error]', slug, status, JSON.stringify(data));
        throw new Error('fetchTVLProtocolTVL: invalid response');
      }
      await this.defillamaTvlProtocolModel._collection.updateOne(
        {
          slug,
        },
        {
          $set: {
            currentTvl: data,
            updated_at: new Date(),
            updated_by: 'system',
          },
        },
      );
    } catch (error) {
      this.logger.discord('error', '[fetchTVLProtocolTVL:error]', JSON.stringify(error));
      throw error;
    }
  }
  //TODO : Finish this
  async fetchStableCoinsList() {
    try {
      const { data, status } = await DefillamaAPI.fetch({
        endpoint: DefillamaAPI.StableCoins.list.endpoint,
        params: DefillamaAPI.StableCoins.list.params,
      });
      if (status != 200) {
        this.logger.discord('error', '[fetchStableCoinsList:error]', status, JSON.stringify(data));
        throw new Error('fetchStableCoinsList: invalid response');
      }
    } catch (error) {
      this.logger.discord('error', '[fetchStableCoinsList:error]', JSON.stringify(error));
      throw error;
    }
  }

  async fetchCoinsHistoricalData({
    id,
    timestamp,
    symbol,
    token,
  }: {
    id: string;
    timestamp: number;
    symbol: string;
    token: string;
  }) {
    try {
      await this.getCoinsHistoricalData({
        id,
        timestamp,
        token,
      });
    } catch (error) {
      this.logger.discord('error', '[fetchCoinsHistoricalData:error]', JSON.stringify(error));
      throw error;
    }
  }

  async getCoinsHistoricalData({ id, timestamp, token }: { id: string; timestamp: number; token: string }) {
    const exists = await this.mgClient
      .db(getMgOnChainDbName())
      .collection('token-price')
      .findOne({
        timestamp: {
          $lte: timestamp + 1000 * 60,
          $gte: timestamp - 1000 * 60,
        },
        $or: [{ id }, { token_address: token }],
      });
    if (exists && exists.price) {
      return exists;
    }
    const { coins } = await getCoinsHistorical({
      coins: `${id}`,
      timestamp,
    });
    if (!coins[id] || !coins[id].price) {
      this.logger.discord(
        'error',
        '[fetchCoinsHistoricalData:error]',
        JSON.stringify({
          req: {
            id,
            timestamp,
          },
          res: coins,
        }),
      );
      throw new Error('fetchCoinsHistoricalData: Invalid response');
    }
    const { price, timestamp: _timestamp, decimals, symbol } = coins[id];
    await this.mgClient.db(getMgOnChainDbName()).collection('token-price').insertOne({
      price,
      updated_at: new Date(),
      timestamp: _timestamp,
      id,
      symbol,
      decimals,
      token_address: token,
    });
    return {
      price,
      timestamp: _timestamp,
      decimals,
      symbol,
      id,
    };
  }

  async addFetchCoinsHistoricalDataJob() {
    const tokens = await this.mgClient
      .db('onchain')
      .collection('token')
      .find({
        enabled: true,
        coingeckoId: {
          $exists: true,
          $ne: null,
        },
      })
      .toArray();

    const maxTimestamp = await this.mgClient
      .db('onchain')
      .collection('token-price')
      .find({})
      .sort({
        timestamp: -1,
      })
      .limit(1)
      .toArray();
    const start = maxTimestamp[0]?.timestamp
      ? new Date(
          new Date(maxTimestamp[0].timestamp * 1000).getFullYear(),
          new Date(maxTimestamp[0].timestamp * 1000).getMonth(),
          new Date(maxTimestamp[0].timestamp * 1000).getDate(),
        )
      : new Date('2023-01-01');

    const jobs = await Promise.all(
      tokens
        .map((token) => {
          const { coingeckoId, symbol, chain_id, address } = token;
          const dates = createArrayDateByHours({
            start,
            end: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), new Date().getHours()),
            range: 1,
            timestamp: true,
          });
          return dates.map((timestamp) => {
            return {
              name: 'defillama:fetch:coin:historical:data:id:timestamp',
              data: {
                id: coingeckoId ? `coingecko:${coingeckoId}` : `ethereum:${chain_id}:${address}`,
                symbol,
                timestamp,
                token: address,
              },
              opts: {
                jobId: `defillama:fetch:coin:historical:data:id:timestamp:${coingeckoId}:${timestamp}`,
                removeOnComplete: true,
                removeOnFail: false,
                attempts: 10,
              },
            };
          });
        })
        .flat(),
    );
    await this.queueToken.addBulk(jobs);

    const discord = Container.get(DIDiscordClient);

    await discord.sendMsg({
      message:
        `\`\`\`diff` +
        `\n[DEFILLAMA-addFetchCoinsHistoricalDataJob]` +
        `\n+ total_job: ${jobs.length}` +
        `\nstart on::${new Date().toISOString()}` +
        `\`\`\``,
      channelId: '1041620555188682793',
    });
  }

  async addUpdateUsdValueOfTransactionsJob() {
    // const redisPattern = 'bull:defillama-onchain:defillama:update:usd:value:of:transaction';
    // const defillamaOnchainKeys = await getRedisKeys(`${redisPattern}:*`);
    // const onchainPricePattern = 'bull:onchain-price:update:transaction:usd-value';
    // const onchainPriceKeys = await getRedisKeys(`${onchainPricePattern}:*`);
    // const _keys = uniq([
    //   ...defillamaOnchainKeys.map((key) => key.replace(`${redisPattern}:`, '')),
    //   ...onchainPriceKeys.map((key) => key.replace(`${onchainPricePattern}:`, '')),
    // ]);
    const transactions = await this.mgClient
      .db('onchain')
      .collection('tx-event')
      .find({
        usd_value: {
          $exists: false,
        },
      })
      .sort({
        block_at: -1,
      })
      .limit(20000)
      .toArray();
    const jobs = transactions.map((transaction) => {
      const { tx_hash, token: token, symbol, block_at, amount, chain_id, block_number, log_index } = transaction;
      return {
        name: 'defillama:update:usd:value:of:transaction',
        data: {
          log_index,
          tx_hash,
          token,
          timestamp: block_at,
          amount,
          chain_id,
          block_number,
          symbol,
        },
        opts: {
          jobId: `defillama:update:usd:value:of:transaction:${tx_hash}:${log_index}`,
          removeOnComplete: true,
          removeOnFail: {
            age: 60 * 5,
          },
          priority: daysDiff(new Date(), new Date(block_at * 1000)),
          attempts: 10,
        },
      };
    });
    await this.queueOnchain.addBulk(jobs);
    const discord = Container.get(DIDiscordClient);

    await discord.sendMsg({
      message:
        `\`\`\`diff` +
        `\n[DEFILLAMA-addUpdateUsdValueOfTransactionsJob]` +
        `\n+ total_job: ${jobs.length}` +
        `\nstart on::${new Date().toISOString()}` +
        `\`\`\``,
      channelId: '1041620555188682793',
    });
  }

  async updateUsdValueOfTransaction({
    tx_hash,
    log_index,
    token,
    timestamp,
    amount,
    chain_id,
    block_number,
    symbol,
  }: {
    tx_hash: string;
    token: string;
    timestamp: number;
    amount: number;
    chain_id: number;
    block_number: number;
    symbol: string;
    log_index: number;
  }) {
    try {
      const chain = Object.values(CHAINS).find((chain) => chain.id === chain_id);
      if (!chain) {
        this.logger.discord(
          'error',
          '[updateUsdValueOfTransaction:chain:error]',
          JSON.stringify({
            req: {
              tx_hash,
              token,
              timestamp,
              amount,
              chain_id,
            },
            res: chain,
          }),
        );
        throw new Error('updateUsdValueOfTransaction: Invalid chain');
      }
      const _token =
        (await getTokenOnRedis({
          chainId: chain_id,
          address: token,
        })) ??
        (await this.mgClient.db('onchain').collection('token').findOne({
          address: token,
        }));
      if (!_token || !_token.coingeckoId) {
        this.logger.discord(
          'error',
          '[updateUsdValueOfTransaction:token:error]',
          JSON.stringify({
            req: {
              tx_hash,
              token,
              timestamp,
              amount,
              chain_id,
            },
            res: token,
          }),
        );
        throw new Error('updateUsdValueOfTransaction: Invalid token');
      }
      const { price, timestamp: _timestamp } = await this.getCoinsHistoricalData({
        id: `coingecko:${_token.coingeckoId}`,
        token,
        timestamp,
      });
      await this.mgClient
        .db('onchain')
        .collection('tx-event')
        .updateOne(
          {
            tx_hash,
            log_index,
          },
          {
            $set: {
              price,
              usd_value: amount * price,
              price_at: _timestamp,
              updated_at: new Date(),
            },
          },
        );
      // await Promise.all([
      //   this.mgClient
      //     .db('onchain-log')
      //     .collection('transaction-price-log')
      //     .insertOne({
      //       tx_hash,
      //       input: {
      //         tx_hash,
      //         log_index,
      //         token,
      //         timestamp,
      //         amount,
      //         chain_id,
      //         block_number,
      //         symbol,
      //       },
      //       output: {
      //         price,
      //         usd_value: amount * price,
      //         price_at: _timestamp,
      //       },
      //       var: {
      //         chain,
      //       },
      //       updated_by: 'defillama-onchain',
      //       updated_at: new Date(),
      //     }),
      // ]);
    } catch (error) {
      this.logger.discord(
        'error',
        '[updateUsdValueOfTransaction:error]',
        JSON.stringify({
          req: {
            tx_hash,
            token,
            timestamp,
            amount,
            chain_id,
          },
          res: error,
        }),
      );
      throw error;
    }
  }

  async addUpdatePoolOfTransactionsJob() {
    const transactions = await this.mgClient
      .db('onchain')
      .collection('tx-event')
      .find(
        {},
        {
          limit: 25000,
        },
      )
      .toArray();
    const jobs = transactions.map((transaction) => {
      const { tx_hash, log_index, from, to } = transaction;
      return {
        name: 'defillama:update:pool:of:transaction',
        data: {
          tx_hash,
          log_index,
          from,
          to,
        },
        opts: {
          jobId: `defillama:update:pool:of:transaction:${tx_hash}`,
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 10,
        },
      };
    });
    await this.queuePool.addBulk(jobs);

    const discord = Container.get(DIDiscordClient);

    await discord.sendMsg({
      message:
        `\`\`\`diff` +
        `\n[DEFILLAMA-addUpdatePoolOfTransactionsJob]` +
        `\n+ total_job: ${jobs.length}` +
        `\nstart on::${new Date().toISOString()}` +
        `\`\`\``,
      channelId: '1041620555188682793',
    });
  }

  async updatePoolOfTransaction({
    from,
    to,
    tx_hash,
    log_index,
  }: {
    tx_hash: string;
    from: string;
    to: string;
    log_index: number;
  }) {
    // console.log({ tx_hash, from, to });
    const pools = await this.mgClient
      .db('onchain')
      .collection('pool-book')
      .find({
        pool_id: {
          $in: [from, to],
        },
      })
      .toArray();
    if (pools && pools.length > 0) {
      await this.mgClient
        .db(getMgOnChainDbName())
        .collection('tx-event')
        .findOneAndUpdate(
          {
            tx_hash,
            log_index,
          },
          {
            $set: {
              updated_at: new Date(),
            },
            $push: {
              pools: {
                $each: pools.map(({ pool_id: id, details: { name }, protocol_id, chain }) => ({
                  id,
                  name,
                  protocol_id,
                  chain,
                })),
              },
            } as any,
          },
        );
    }
    await this.mgClient
      .db(getMgOnChainDbName())
      .collection('transaction-pool-log')
      .insertOne({
        tx_hash,
        log_index,
        updated_at: new Date(),
        pools: pools.map(({ pool_id: id, details: { name }, protocol_id, chain }) => ({
          id,
          name,
          protocol_id,
          chain,
        })),
      });
  }

  async addUpdateCoinsCurrentPriceJob() {
    const coins = await this.mgClient
      .db('onchain')
      .collection('token')
      .find({
        enabled: true,
        coingeckoId: {
          $exists: true,
          $ne: null,
        },
      })
      .toArray();
    const list_coins = chunk(coins, 50);
    const jobs = list_coins.map((coin) => {
      return {
        name: 'defillama:update:coins:current:price',
        data: {
          coins: coin.map(({ address, coingeckoId }) => `coingecko:${coingeckoId}`).join(','),
        },
        opts: {
          removeOnComplete: true,
          removeOnFail: false,
          priority: 1,
        },
      };
    });
    await this.queuePrice.addBulk(jobs);
    const discord = Container.get(DIDiscordClient);

    await discord.sendMsg({
      message:
        `\`\`\`diff` +
        `\n[DEFILLAMA-addUpdateCoinsCurrentPriceJob]` +
        `\n+ total_job: ${jobs.length}` +
        `\nstart on::${new Date().toISOString()}` +
        `\`\`\``,
      channelId: '1041620555188682793',
    });
  }
  async updateCoinsCurrentPrice({ coins }) {
    const prices = await getCoinsCurrentPrice({
      coins,
    });
    const data = Object.entries(prices.coins).map(([id, { price, symbol, confidence, timestamp }]: [string, any]) => {
      return {
        id,
        price,
        symbol,
        confidence,
        timestamp,
        updated_at: new Date(),
      };
    });
    await Bluebird.map(
      data,
      async (item) => {
        const { id, timestamp, price, symbol, updated_at, confidence } = item;
        await Promise.all([
          setExpireRedisKey({
            key: `price:${symbol}`,
            expire: 60 * 5,
            value: `${timestamp}:${price}`,
          }),
          this.mgClient.db('onchain').collection('token-price').insertOne({
            price,
            updated_at,
            id,
            symbol,
            timestamp,
            updated_by: 'defillama',
          }),
        ]);
      },
      {
        concurrency: 50,
      },
    );
  }
}
