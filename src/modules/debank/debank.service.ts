import Container from 'typedi';
import Logger from '@/core/logger';
import { Job, JobsOptions, MetricsTime, Queue, QueueEvents, Worker } from 'bullmq';
import { env } from 'process';
import { DIRedisConnection } from '@/loaders/redisClientLoader';
import IORedis from 'ioredis';

import { DebankJobData, DebankJobNames } from './debank.job';
import { DebankAPI } from '@/common/api';
import { pgPoolToken } from '@/loaders/pgLoader';

const pgPool = Container.get(pgPoolToken);

export class DebankService {
  private logger = new Logger('Debank');

  private readonly redisConnection = Container.get(DIRedisConnection);

  private worker: Worker;

  private queue: Queue;

  // private queueScheduler: QueueScheduler;

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
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 60,
      concurrency: 100,
      limiter: {
        max: 50,
        duration: 5 * 60 * 1000,
      },
      metrics: {
        maxDataPoints: MetricsTime.TWO_WEEKS,
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
    // this.queueScheduler = new QueueScheduler('debank', {
    //   connection: this.redisConnection,
    // });
    const queueEvents = new QueueEvents('debank', {
      connection: this.redisConnection,
    });
    // TODO: ENABLE THIS
    this.initRepeatJobs();

    // queueEvents.on('completed', ({ jobId }) => {
    //   this.logger.debug('success', 'Job completed', { jobId });
    // });

    queueEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      this.logger.discord('error', 'debank:Job failed', jobId, failedReason);
    });
    // TODO: REMOVE THIS LATER
    // this.addFetchProjectUsersJobs();
  }
  private initRepeatJobs() {
    this.addJob({
      name: 'debank:fetch:project:list',
      options: {
        repeatJobKey: 'debank:fetch:project:list',
        repeat: {
          every: 1000 * 60 * 60,
        },
        priority: 1,
      },
    });
    this.addJob({
      name: 'debank:add:project:users',
      options: {
        repeatJobKey: 'debank:add:project:users',
        repeat: {
          every: 1000 * 60 * 15,
        },
        priority: 1,
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
      .catch((err) => this.logger.discord('error', `[addJob:error]`, JSON.stringify(err), JSON.stringify(payload)));
  }
  /**
   * Initialize Worker listeners
   * @private
   */
  private initWorkerListeners(worker: Worker) {
    // Completed
    worker.on('completed', ({ id, data, name }: Job<DebankJobData>) => {
      this.logger.discord('success', '[job:debank:completed]', id, name, JSON.stringify(data));
    });
    // Failed
    worker.on('failed', ({ id, name, data, failedReason }: Job<DebankJobData>, error: Error) => {
      this.logger.discord(
        'error',
        '[job:debank:error]',
        id,
        name,
        failedReason,
        JSON.stringify(data),
        JSON.stringify(error),
      );
    });
  }
  workerProcessor({ name, data }: Job<DebankJobData>): Promise<void> {
    // this.logger.discord('info', `[debank:workerProcessor:run]`, name);
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
        await pgPool.query(
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
        );
        // .catch((err) => this.logger.discord('error', '[fetchProjectList:insert]', JSON.stringify(err)));
      }
    } catch (error) {
      this.logger.discord('error', '[fetchProjectList:error]', JSON.stringify(error));
      throw error;
    }
  }
  async addFetchProjectUsersJobs() {
    try {
      const { rows: projects } = await pgPool.query(`SELECT id FROM "debank-projects" GROUP BY id`);
      for (const { id } of projects) {
        this.addJob({
          name: 'debank:fetch:project:users',
          payload: {
            projectId: id,
          },
          options: {
            jobId: `debank:fetch:project:users:${id}`,
            removeOnComplete: true,
            removeOnFail: true,
            priority: 10,
          },
        });
      }
    } catch (error) {
      this.logger.discord('error', '[addFetchProjectUsersJobs:error]', JSON.stringify(error));
      throw error;
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
          .catch((err) => this.logger.discord('error', '[fetchProjectUsers:insert]', JSON.stringify(err)));
      }
    } catch (error) {
      this.logger.discord('error', '[fetchProjectUsers:error]', JSON.stringify(error));
      throw error;
    }
  }
}
