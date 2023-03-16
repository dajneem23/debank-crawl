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
import { getCoinsHistorical } from './defillama.func';
import { Db, MongoClient } from 'mongodb';
import { DIMongoClient } from '@/loaders/mongoDB.loader';
import { createArrayDateByHours } from '@/utils/date';
import { WHITELIST_TOKENS } from '@/common/token';

const pgPool = Container.get(pgPoolToken);

export class DefillamaService {
  private logger = new Logger('Defillama');

  private readonly redisConnection = Container.get(DIRedisConnection);

  private readonly defillamaTvlProtocolModel = Container.get(defillamaTvlProtocolModelToken);

  private readonly defillamaTvlChartModel = Container.get(defillamaTvlChartModelToken);

  private readonly defillamaTvlChainModel = Container.get(defillamaTvlChainModelToken);

  private worker: Worker;

  private queue: Queue;

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
      lockDuration: 1000 * 60,
      concurrency: 50,
      limiter: {
        max: 20,
        duration: 60 * 1000,
      },
      metrics: {
        maxDataPoints: MetricsTime.TWO_WEEKS,
      },
    });
    this.logger.debug('info', '[initWorker:defillama]', 'Worker initialized');
    this.initWorkerListeners(this.worker);
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
    // TODO: ENABLE THIS
    this.initRepeatJobs();

    // queueEvents.on('completed', ({ jobId }) => {
    //   this.logger.debug('success', 'Job completed', { jobId });
    // });

    queueEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      this.logger.debug('error', ':defillamaJob failed', { jobId, failedReason });
    });
    // TODO: REMOVE THIS LATER
    // this.addFetchTVLProtocolTVLJob();
    // this.addFetchCoinsHistoricalDataJob();
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
    this.queue
      .add(name, payload, options)
      // .then(({ id, name }) => this.logger.debug(`success`, `[addJob:success]`, { id, name, payload }))
      .catch((err) => this.logger.discord('error', `[addJob:error]`, JSON.stringify(err), JSON.stringify(payload)));
  }
  /**
   * Initialize Worker listeners
   * @private
   */
  private initWorkerListeners(worker: Worker) {
    // Completed
    worker.on('completed', ({ id, data, name }: Job<DefillamaJobData>) => {
      this.logger.discord('success', '[job:defillama:completed]', id, name, JSON.stringify(data));
    });
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
              symbol,
            },
            res: coins,
          }),
        );
        throw new Error('fetchCoinsHistoricalData: Invalid response');
      }
      const { decimals, price, timestamp: _timestamp } = coins[id];

      await this.mgClient
        .db('onchain')
        .collection('token-price')
        .findOneAndUpdate(
          {
            timestamp,
            symbol,
          },
          {
            $set: {
              price,
              decimals,

              updated_at: new Date(),
            },
            $setOnInsert: {
              created_at: new Date(),
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

  async addFetchCoinsHistoricalDataJob() {
    const tokens = await this.mgClient
      .db('onchain')
      .collection('token')
      .find({
        enabled: true,
      })
      .toArray();

    const jobs = tokens
      .map((token) => {
        const { coingeckoId, symbol } = token;
        const dates = createArrayDateByHours({
          start: new Date('2023-01-01'),
          end: new Date(),
          range: 6,
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
      .flat();
    // if (process.env.NODE_ENV === 'production') {
    await this.queue.addBulk(jobs);
    // }
  }
}
