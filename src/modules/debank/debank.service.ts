import Container, { Inject, Service, Token } from 'typedi';
import Logger from '@/core/logger';
import { sleep } from '@/utils/common';
import { Job, JobsOptions, Queue, QueueEvents, QueueScheduler, Worker } from 'bullmq';
import { env } from 'process';
import { DIRedisConnection } from '@/loaders/redisClientLoader';
import IORedis from 'ioredis';

import { DebankJobData, DebankJobNames } from './debank.job';
import { DebankAPI } from '@/common/api';
import { pgPoolToken } from '@/loaders/pgLoader';

const pgPool = Container.get(pgPoolToken);

export class DebankService {
  private logger = new Logger('Debank');

  private readonly redisConnection: IORedis.Redis = Container.get(DIRedisConnection);

  private worker: Worker;

  private queue: Queue;

  private queueScheduler: QueueScheduler;

  private readonly jobs: {
    [key in DebankJobNames | 'default']?: () => Promise<void>;
  } = {
    'debank:fetch:project:list': this.fetchProjectList,
    'debank:add:project:users': this.addFetchProjectUsersJobs,
    'debank:fetch:project:users': this.fetchProjectUsers,

    default: () => {
      throw new Error('Invalid job name');
    },
  };

  constructor() {
    // this.fetchProjectList();
    // this.fetchProjectUsers({
    //   projectId: '0x',
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
    this.worker = new Worker('debank', this.workerProcessor.bind(this), {
      connection: this.redisConnection as any,
      lockDuration: 1000 * 60,
      concurrency: 20,
      limiter: {
        max: 3,
        duration: 5 * 60 * 1000,
      },
    });
    this.logger.debug('info', '[initWorker:debank]', 'Worker initialized');
    this.initWorkerListeners(this.worker);
  }
  /**
   *  @description init BullMQ Queue
   */
  private initQueue() {
    this.queue = new Queue('debank', {
      connection: this.redisConnection as any,
      defaultJobOptions: {
        // The total number of attempts to try the job until it completes
        attempts: 5,
        // Backoff setting for automatic retries if the job fails
        backoff: { type: 'exponential', delay: 3000 },
      },
    });
    this.queueScheduler = new QueueScheduler('debank', {
      connection: this.redisConnection as any,
    });
    const queueEvents = new QueueEvents('debank', {
      connection: this.redisConnection as any,
    });
    // TODO: ENABLE THIS
    this.addFetchingDataJob();

    queueEvents.on('completed', ({ jobId }) => {
      this.logger.debug('success', 'Job completed', { jobId });
    });

    queueEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      this.logger.debug('error', 'Job failed', { jobId, failedReason });
    });
    // TODO: REMOVE THIS LATER
    // this.addFetchProjectUsersJobs();
  }
  private addFetchingDataJob() {
    this.addJob({
      name: 'debank:fetch:project:list',
      options: {
        repeat: {
          every: 1000 * 60 * 60,
        },
      },
    });
    this.addJob({
      name: 'debank:add:project:users',
      options: {
        repeat: {
          every: 1000 * 60 * 60,
        },
      },
    });
  }
  /**
   * @description add job to queue
   */
  addJob({ name, payload = {}, options }: { name: DebankJobNames; payload?: any; options?: JobsOptions }) {
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
    worker.on('completed', ({ id, data, name }: Job<DebankJobData>) => {
      this.logger.debug('success', '[job:debank:completed]', {
        id,
        name,
        data,
      });
    });
    // Failed
    worker.on('failed', ({ id, name, data, failedReason }: Job<DebankJobData>, error: Error) => {
      this.logger.error('error', '[job:debank:error]', {
        id,
        name,
        data,
        error,
        failedReason,
      });
    });
  }
  workerProcessor({ name, data }: Job<DebankJobData>): Promise<void> {
    this.logger.debug('info', `[workerProcessor]`, { name, data });
    return this.jobs[name as keyof typeof this.jobs]?.call(this, data) || this.jobs.default();
  }
  async fetchProjectList() {
    try {
      const { data, status } = await DebankAPI.fetch({
        endpoint: DebankAPI.Project.list.endpoint,
      });
      if (status !== 200) {
        throw new Error('fetchProjectList: Error fetching project list');
      }
      const { data: projects = [] } = data;
      for (const {
        id,
        name,
        chain,
        platform_token_chain,
        platform_token_id,
        site_url,
        tvl,
        active_user_count_24h,
        contract_call_count_24h,
        portfolio_user_count,
        total_contract_count,
        total_user_count,
        total_user_usd,
        is_stable,
        is_support_portfolio,
        is_tvl,
        priority,
      } of projects) {
        await pgPool
          .query(
            `INSERT INTO "debank-projects" (
            id,
            name,
            chain,
            platform_token_chain,
            platform_token_id,
            site_url,
            tvl,
            active_user_count_24h,
            contract_call_count_24h,
            portfolio_user_count,
            total_contract_count,
            total_user_count,
            total_user_usd,
            is_stable,
            is_support_portfolio,
            is_tvl,
            priority,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
            [
              id,
              name,
              chain,
              platform_token_chain,
              platform_token_id,
              site_url,
              tvl,
              active_user_count_24h,
              contract_call_count_24h,
              portfolio_user_count,
              total_contract_count,
              total_user_count,
              total_user_usd,
              is_stable,
              is_support_portfolio,
              is_tvl,
              priority,
              new Date(),
            ],
          )
          .catch((err) => this.logger.error('error', '[fetchProjectList:insert]', err));
      }
    } catch (error) {
      this.logger.error('error', '[fetchProjectList:error]', error);
    }
  }
  async addFetchProjectUsersJobs() {
    try {
      const { rows: projects } = await pgPool.query(`SELECT id FROM "debank-projects"`);
      for (const { id } of projects) {
        this.addJob({
          name: 'debank:fetch:project:users',
          payload: {
            projectId: id,
          },
          options: {
            removeOnComplete: {
              age: 3600, // keep up to 1 hour
            },
          },
        });
      }
    } catch (error) {
      this.logger.error('error', '[addFetchProjectUsersJobs:error]', error);
    }
  }
  async fetchProjectUsers(
    { projectId }: { projectId: string } = {
      projectId: null,
    },
  ) {
    try {
      if (!projectId) {
        throw new Error('fetchProjectUsers: projectId is required');
      }
      const { data, status } = await DebankAPI.fetch({
        endpoint: DebankAPI.Project.users.endpoint,
        params: {
          id: projectId,
        },
      });
      if (status !== 200) {
        throw new Error('fetchProjectUsers: Error fetching project users');
      }
      const {
        data: { user_list = [] },
      } = data;
      for (const { share, usd_value, user_addr: user_address } of user_list) {
        await pgPool
          .query(
            `INSERT INTO "debank-project-users" (
            project_id,
            share,
            usd_value,
            user_address,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5)`,
            [projectId, share, usd_value, user_address, new Date()],
          )
          .catch((err) => this.logger.error('error', '[fetchProjectUsers:insert]', err));
      }
    } catch (error) {
      this.logger.error('error', '[fetchProjectUsers:error]', error);
    }
  }
}
