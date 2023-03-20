import Container from 'typedi';
import Logger from '@/core/logger';
import { pgPoolToken } from '@/loaders/pg.loader';
import { Job, JobsOptions, MetricsTime, Queue, QueueEvents, Worker } from 'bullmq';
import { env } from 'process';
import { DIRedisConnection } from '@/loaders/redis.loader';
import IORedis from 'ioredis';

import { DefillamaJobData, DefillamaJobNames } from './defillama.job';
import { DefillamaAPI } from '@/common/api';
import {
  defillamaTvlChainModelToken,
  defillamaTvlChartModelToken,
  defillamaTvlProtocolModelToken,
} from './defillama.model';
import { getCoinsHistorical, updateCoinsHistoricalKeyCache } from './defillama.func';
import { Db, MongoClient } from 'mongodb';
import { DIMongoClient } from '@/loaders/mongoDB.loader';
import { createArrayDateByHours } from '@/utils/date';
import { WHITELIST_TOKENS } from '@/common/token';
import { getMgOnChainDbName } from '@/common/db';
import cacache from 'cacache';
import { CACHE_PATH } from '@/common/cache';
import { DIDiscordClient } from '@/loaders/discord.loader';
import Bluebird from 'bluebird';
import { uniq } from 'lodash';
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

  private queue: Queue;

  private queueOnchain: Queue;

  private queueToken: Queue;

  private queuePool: Queue;

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
    default: () => {
      throw new Error('Invalid job name');
    },
  };

  constructor() {
    // this.fetchTVLProtocolDetails();
    // this.fetchTVLChains();
    // this.fetchTVLCharts();
    // this.fetchStableCoinsList();
    // this.fetchCoinsHistoricalData({
    //   id: 'ethereum:0xfA5047c9c78B8877af97BDcb85Db743fD7313d4a',
    //   symbol: 'ROOK',
    //   timestamp: 1648680149,
    // });
    // this.addFetchCoinHistoricalDataJob({
    //   id: '',
    // });
    // this.updateUsdValueOfTransaction({
    //   hash: '0x4382f84051d2db96736f80e3a34b1db894853cab896aa1126f73476700d01e19',
    // }).then((res) => {
    //   console.log('done');
    // });
    // this.initQueue();
    // (async () => {
    //   // const collection = this.mgClient.db('onchain-dev').collection('transaction');
    //   // const prodCollection = this.mgClient.db('onchain').collection('transaction');
    //   // const res = await collection.find({}).toArray();
    //   // const data = await prodCollection
    //   //   .find(
    //   //     {},
    //   //     {
    //   //       limit: 20000,
    //   //       skip: 20000 * 2,
    //   //     },
    //   //   )
    //   //   .toArray();
    //   // const insertedData = await data.filter((item) => {
    //   //   const found = res.find((i) => i.hash === item.hash);
    //   //   return !found;
    //   // });
    //   // await collection.insertMany(insertedData);

    //   // console.log('done insert', insertedData.length);
    //   const collection = this.mgClient.db('onchain-dev').collection('transaction');
    //   const res = await collection.find({}).toArray();
    //   console.log(res.length);
    //   //group 200 items to 1 array

    //   await this.updatePoolOfTransaction({
    //     addresses: group,
    //   });

    //   console.log('done find');
    // })();
    // this.addFetchCoinsHistoricalDataJob();
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
    this.worker = new Worker('defillama', this.workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 60 * 5,
      concurrency: 25,
      stalledInterval: 1000 * 60,
      maxStalledCount: 10,
      // limiter: {
      //   max: 200,
      //   duration: 60 * 1000,
      // },
      metrics: {
        maxDataPoints: MetricsTime.TWO_WEEKS,
      },
    });
    this.initWorkerListeners(this.worker);

    this.workerOnchain = new Worker('defillama-onchain', this.workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 60,
      concurrency: 25,
      limiter: {
        max: 200,
        duration: 60 * 1000,
      },
      metrics: {
        maxDataPoints: MetricsTime.TWO_WEEKS,
      },
    });
    this.initWorkerListeners(this.workerOnchain);

    this.workerToken = new Worker('defillama-token', this.workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 60,
      concurrency: 25,
      limiter: {
        max: 600,
        duration: 60 * 1000,
      },
      metrics: {
        maxDataPoints: MetricsTime.TWO_WEEKS,
      },
    });
    this.initWorkerListeners(this.workerToken);

    this.workerPool = new Worker('defillama-pool', this.workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 60,
      concurrency: 100,
      // limiter: {
      //   max: 600,
      //   duration: 60 * 1000,
      // },
      metrics: {
        maxDataPoints: MetricsTime.TWO_WEEKS,
      },
    });
    this.initWorkerListeners(this.workerPool);
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
    this.queue.add(
      'defillama:add:fetch:coin:historical',
      {},
      {
        repeatJobKey: 'defillama:add:fetch:coin:historical',
        jobId: 'defillama:add:fetch:coin:historical',
        repeat: {
          every: 1000 * 60 * 60,
        },
        removeOnComplete: true,
        removeOnFail: true,
        priority: 1,
        attempts: 5,
      },
    );
    this.queue.add(
      'defillama:add:update:usd:value:of:transaction',
      {},
      {
        repeatJobKey: 'defillama:add:update:usd:value:of:transaction',
        jobId: 'defillama:add:update:usd:value:of:transaction',
        repeat: {
          every: 1000 * 60 * 60,
        },
        removeOnComplete: true,
        removeOnFail: false,
        priority: 1,
        attempts: 5,
      },
    );

    this.queue.add(
      'defillama:add:pool:of:transaction',
      {},
      {
        repeatJobKey: 'defillama:add:pool:of:transaction',
        jobId: 'defillama:add:pool:of:transaction',
        repeat: {
          every: 1000 * 60 * 60,
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
  workerProcessor({ name, data }: Job<DefillamaJobData>): Promise<void> {
    // this.logger.debug('info', `[defillama:workerProcessor:run]`, { name, data });
    return this.jobs[name as keyof typeof this.jobs]?.call(this, data) || this.jobs.default();
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

  async fetchCoinsHistoricalData({ id, timestamp, symbol }: { id: string; timestamp: number; symbol: string }) {
    try {
      const { price, timestamp: _timestamp } = await this.getCoinsHistoricalData({
        id,
        timestamp,
      });
      await this.mgClient
        .db(getMgOnChainDbName())
        .collection('token-price')
        .findOneAndUpdate(
          {
            timestamp,
            symbol,
          },
          {
            $set: {
              price,
              updated_at: new Date(),
            },
            $setOnInsert: {
              timestamp: _timestamp,
              symbol,
              id,
            },
          },
          {
            upsert: true,
          },
        );
    } catch (error) {
      this.logger.discord('error', '[fetchCoinsHistoricalData:error]', JSON.stringify(error));
      throw error;
    }
  }

  async getCoinsHistoricalData({ id, timestamp }: { id: string; timestamp: number }) {
    const exists = await this.mgClient.db(getMgOnChainDbName()).collection('token-price').findOne({
      id,
      timestamp,
    });
    if (exists) {
      return exists;
    }
    const { coins } = await getCoinsHistorical({
      coins: `${id}`,
      timestamp,
    });
    if (!coins[id]) {
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
    const { decimals, price, timestamp: _timestamp } = coins[id];
    return {
      decimals,
      price,
      timestamp: _timestamp,
    };
  }

  async addFetchCoinsHistoricalDataJob() {
    const tokens = await this.mgClient
      .db('onchain')
      .collection('token')
      .find({
        enabled: true,
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
          const { coingeckoId, symbol } = token;
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
                id: `coingecko:${coingeckoId}`,
                symbol,
                timestamp,
              },
              opts: {
                jobId: `defillama:fetch:coin:historical:data:id:timestamp:${coingeckoId}:${timestamp}`,
                removeOnComplete: true,
                removeOnFail: false,
              },
            };
          });
        })
        .flat(),
      // .filter(async ({ data }) => {
      //   const { timestamp, id } = data;
      //   const isExist = cacache.get.hasContent(`${CACHE_PATH}/defillama/${id}`, `${id}-${timestamp}`);
      //   return !isExist;
      // }),
    );
    // console.log('jobs', jobs.length);
    // if (process.env.NODE_ENV === 'production') {
    await this.queueToken.addBulk(jobs);
    // }

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
    const transactions = await this.mgClient
      .db('onchain')
      .collection('transaction')
      .find(
        {
          usd_value: 0,
        },
        {
          limit: 25000,
        },
      )
      .toArray();
    const jobs = transactions.map((transaction) => {
      const { hash, token: token_address, timestamp, amount } = transaction;
      return {
        name: 'defillama:update:usd:value:of:transaction',
        data: {
          hash,
          token_address,
          timestamp,
          amount,
        },
        opts: {
          jobId: `defillama:update:usd:value:of:transaction:${hash}`,
          removeOnComplete: true,
          removeOnFail: false,
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
    hash,
    token_address,
    timestamp,
    amount,
  }: {
    hash: string;
    token_address: string;
    timestamp: number;
    amount: number;
  }) {
    const token = await this.mgClient.db('onchain').collection('token').findOne({
      address: token_address,
    });
    if (!token || !token.coingeckoId) {
      this.logger.discord(
        'error',
        '[updateUsdValueOfTransaction:token:error]',
        JSON.stringify({
          req: {
            hash,
            token_address,
            timestamp,
            amount,
          },
          res: token,
        }),
      );
      throw new Error('updateUsdValueOfTransaction: Invalid token');
    }
    const { price, timestamp: _timestamp } = await this.getCoinsHistoricalData({
      id: `coingecko:${token.coingeckoId}`,
      timestamp,
    });
    await this.mgClient
      .db(getMgOnChainDbName())
      .collection('transaction')
      .findOneAndUpdate(
        {
          hash,
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
  }

  async addUpdatePoolOfTransactionsJob() {
    const transactions = await this.mgClient
      .db('onchain')
      .collection('transaction')
      .find(
        {
          updated_pool: {
            $ne: true,
          },
        },
        {
          limit: 25000,
        },
      )
      .toArray();
    const jobs = transactions.map((transaction) => {
      const { hash, from, to } = transaction;
      return {
        name: 'defillama:update:pool:of:transaction',
        data: {
          hash,
          from,
          to,
        },
        opts: {
          jobId: `defillama:update:pool:of:transaction:${hash}`,
          removeOnComplete: true,
          removeOnFail: false,
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

  async updatePoolOfTransaction({ from, to, hash }: { hash: string; from: string; to: string }) {
    // console.log({ hash, from, to });
    const pools = await this.mgClient
      .db('onchain')
      .collection('contract-pools')
      .find({
        pool_id: {
          $in: [from, to],
        },
      })
      .toArray();
    if (pools && pools.length > 0) {
      await this.mgClient
        .db(getMgOnChainDbName())
        .collection('transaction')
        .findOneAndUpdate(
          {
            hash,
          },
          {
            $set: {
              updated_at: new Date(),
              updated_pool: true,
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
    } else {
      await this.mgClient
        .db(getMgOnChainDbName())
        .collection('transaction')
        .findOneAndUpdate(
          {
            hash,
          },
          {
            $set: {
              updated_at: new Date(),
              updated_pool: true,
            },
          },
        );
    }
  }
}
