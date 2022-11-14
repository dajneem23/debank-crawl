import Container, { Inject, Service, Token } from 'typedi';
import Logger from '@/core/logger';
import { sleep } from '@/utils/common';
import { pgPoolToken } from '@/loaders/pgLoader';
import { Job, JobsOptions, Queue, QueueEvents, QueueScheduler, Worker } from 'bullmq';
import { env } from 'process';
import { DIRedisConnection } from '@/loaders/redisClientLoader';
import IORedis from 'ioredis';

import { DefillamaJobData, DefillamaJobNames } from './defillama.job';
import { DefillamaAPI } from '@/common/api';
import {
  defillamaTvlChainModelToken,
  defillamaTvlChartModelToken,
  defillamaTvlProtocolModelToken,
} from './defillama.model';

const pgPool = Container.get(pgPoolToken);

export class DefillamaService {
  private logger = new Logger('Defillama');

  private readonly redisConnection: IORedis.Redis = Container.get(DIRedisConnection);

  private readonly defillamaTvlProtocolModel = Container.get(defillamaTvlProtocolModelToken);

  private readonly defillamaTvlChartModel = Container.get(defillamaTvlChartModelToken);

  private readonly defillamaTvlChainModel = Container.get(defillamaTvlChainModelToken);

  private worker: Worker;

  private queue: Queue;

  private queueScheduler: QueueScheduler;

  private readonly jobs: {
    [key in DefillamaJobNames | 'default']?: () => Promise<void>;
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
    default: () => {
      throw new Error('Invalid job name');
    },
  };

  constructor() {
    // this.fetchTVLProtocolDetails();
    // this.fetchTVLChains();
    // this.fetchTVLCharts();
    this.fetchStableCoinsList();
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
      connection: this.redisConnection as any,
      lockDuration: 1000 * 60,
      concurrency: 20,
      limiter: {
        max: 3,
        duration: 5 * 60 * 1000,
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
      connection: this.redisConnection as any,
      defaultJobOptions: {
        // The total number of attempts to try the job until it completes
        attempts: 5,
        // Backoff setting for automatic retries if the job fails
        backoff: { type: 'exponential', delay: 3000 },
      },
    });
    this.queueScheduler = new QueueScheduler('defillama', {
      connection: this.redisConnection as any,
    });
    const queueEvents = new QueueEvents('defillama', {
      connection: this.redisConnection as any,
    });
    // TODO: ENABLE THIS
    // this.addFetchingDataJob();

    queueEvents.on('completed', ({ jobId }) => {
      this.logger.debug('success', 'Job completed', { jobId });
    });

    queueEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      this.logger.debug('error', ':defillamaJob failed', { jobId, failedReason });
    });
    // TODO: REMOVE THIS LATER
    // this.addFetchTVLProtocolTVLJob();
  }
  private addFetchingDataJob() {
    this.addJob({ name: 'defillama:fetch:tvl:protocols' });
    this.addJob({ name: 'defillama:fetch:tvl:charts' });
    this.addJob({ name: 'defillama:fetch:tvl:chains' });
    this.addJob({ name: 'defillama:add:tvl:protocol:details' });
    this.addJob({ name: 'defillama:add:tvl:charts:chains' });
    this.addJob({ name: 'defillama:add:tvl:protocol:tvl' });
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
    },
  }: {
    name: DefillamaJobNames;
    payload?: any;
    options?: JobsOptions;
  }) {
    this.queue
      .add(name, payload, options)
      .then(({ id, name }) => this.logger.debug(`success`, `[addJob:success]`, { id, name, payload }))
      .catch((err) => this.logger.error('error', `[addJob:error]`, err, payload));
  }
  /**
   * Initialize Worker listeners
   * @private
   */
  private initWorkerListeners(worker: Worker) {
    // Completed
    worker.on('completed', ({ id, data, name }: Job<DefillamaJobData>) => {
      this.logger.debug('success', '[job:defillama:completed]', {
        id,
        name,
        data,
      });
    });
    // Failed
    worker.on('failed', ({ id, name, data, failedReason }: Job<DefillamaJobData>, error: Error) => {
      this.logger.error(
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
    this.logger.debug('info', `[defillama:workerProcessor:run]`, { name, data });
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
      this.logger.debug('success', `[fetchTVLProtocols:DONE]`, { num: data.length });
    } catch (error) {
      this.logger.error('error', '[fetchTVLProtocols:error]', error);
    }
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
            // delay: 1000 * 60 * 5,
          },
        });
      }
    } catch (error) {
      this.logger.error('error', '[fetchTVLProtocols:error]', error);
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
      this.logger.error('error', '[fetchTVLProtocols:error]', error);
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
      this.logger.error('error', '[fetchTVLCharts:error]', error);
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
      this.logger.error('error', '[fetchTVLChains:error]', error);
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
          },
        });
      }
    } catch (error) {
      this.logger.error('error', '[addFetchTvlChartsChainsJob:error]', error);
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
        this.logger.error('error', '[fetchTVLChartChain:error]', { name, status, data });
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
      this.logger.error('error', '[fetchTVLChartChain:error]', error);
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
          },
        });
      }
    } catch (error) {
      this.logger.error('error', '[addFetchTVLProtocolTVLJob:error]', error);
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
        this.logger.error('error', '[fetchTVLProtocolTVL:error]', { slug, status, data });
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
      this.logger.error('error', '[fetchTVLProtocolTVL:error]', error);
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
        this.logger.error('error', '[fetchStableCoinsList:error]', { status, data });
        throw new Error('fetchStableCoinsList: invalid response');
      }
    } catch (error) {
      this.logger.error('error', '[fetchStableCoinsList:error]', error);
    }
  }
}
