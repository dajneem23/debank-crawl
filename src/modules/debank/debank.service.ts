import Container, { Token } from 'typedi';
import Logger from '@/core/logger';
import { Job, JobType, JobsOptions, MetricsTime, Queue, QueueEvents, Worker } from 'bullmq';
import { env } from 'process';
import { DIRedisConnection } from '@/loaders/redis.loader';

import { DebankJobData, DebankJobNames } from './debank.job';
import { DebankAPI } from '@/common/api';
import { pgClientToken, pgPoolToken, pgpToken } from '@/loaders/pg.loader';

import STABLE_COINS from '../../data/defillama/stablecoins.json';
import { formatDate } from '@/utils/date';
import {
  bulkInsert,
  bulkInsertOnConflict,
  createPartitionByList,
  createPartitionByRange,
  createPartitionDefault,
  createPartitionsInDateRange,
  truncateTable,
  truncateTableInDateRange,
} from '@/utils/pg';
import { DIDiscordClient } from '@/loaders/discord.loader';
import { arrayObjectToTable } from '@/utils/table';
import { table } from 'table';

export const debankServiceToken = new Token<DebankService>('_debankService');
const account =
  '{"random_at":1675919820,"random_id":"7c7daa4df5744190a78835c2eb44930e","session_id":"8145eab5f7cc45399adb380e564c7b1d","user_addr":"0x2f5076044d24dd686d0d9967864cd97c0ee1ea8d","wallet_type":"metamask","is_verified":true}';

export class DebankService {
  private logger = new Logger('Debank');

  private readonly redisConnection = Container.get(DIRedisConnection);

  private pgPool = Container.get(pgPoolToken);

  private pgClient = Container.get(pgClientToken);

  private worker: Worker;

  private workerInsert: Worker;

  private workerWhale: Worker;

  private workerTopHolder: Worker;

  private workerRanking: Worker;

  private queue: Queue;

  private queueInsert: Queue;

  private queueWhale: Queue;

  private queueTopHolder: Queue;

  private queueRanking: Queue;

  // TODO: adjust this value
  readonly totalRepeatableJobs = 5;

  readonly maxCrawlIdInOneDay = 8;

  readonly keepCrawlIds = [1, 5];

  private readonly jobs: {
    [key in DebankJobNames | 'default']?: (payload?: any) => any;
  } = {
    'debank:fetch:project:list': this.queryProjectList,
    'debank:fetch:project:users': this.fetchProjectUsers,
    'debank:fetch:social:user': this.fetchSocialRankingByUserAddress,
    'debank:fetch:social:rankings:page': this.fetchSocialRankingsPage,
    'debank:fetch:user:project-list': this.fetchUserProjectList,
    'debank:fetch:user:assets-portfolios': this.fetchUserAssetClassify,
    'debank:fetch:user:token-balances': this.fetchUserTokenBalanceList,
    'debank:fetch:whales:page': this.fetchWhalesPage,
    'debank:insert:whale': this.insertWhale,
    'debank:insert:user-address': this.insertUserAddress,
    'debank:insert:user-assets-portfolio': this.insertUserAssetPortfolio,
    'debank:insert:coin': this.insertCoin,
    'debank:fetch:top-holders': this.fetchTopHolders,
    'debank:fetch:top-holders:page': this.fetchTopHoldersPage,
    'debank:insert:top-holder': this.insertTopHolder,

    //! DEPRECATED
    'debank:add:project:users': this.addFetchProjectUsersJobs,
    //!PAUSED
    'debank:add:fetch:coins': this.addFetchCoinsJob,

    //! RUNNING
    'debank:add:social:users': this.addFetchSocialRankingByUsersAddressJob,
    //! RUNNING
    'debank:add:social:users:rankings': this.addFetchSocialRankingJob,
    //! RUNNING
    'debank:add:fetch:whales:paging': this.addFetchWhalesPagingJob,
    //! RUNNING
    'debank:add:fetch:top-holders': this.addFetchTopHoldersJob,
    //! RUNNING
    'debank:add:fetch:user-address:top-holders': this.addFetchTopHoldersByUsersAddressJob,

    //* PARTITION JOBS
    'debank:create:partitions': this.createPartitions,
    default: () => {
      throw new Error('Invalid job name');
    },
  };

  readonly queueName = {
    debank: 'debank',
    debankInsert: 'debank-insert',
    debankWhale: 'debank-whale',
    debankTopHolder: 'debank-top-holder',
    debankRanking: 'debank-ranking',
  };

  constructor() {
    Container.set(debankServiceToken, this);
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
      lockDuration: 1000 * 60 * 5,
      concurrency: 500,
      limiter: {
        max: 50,
        duration: 1000,
      },
      stalledInterval: 1000 * 60,
      maxStalledCount: 5,
      metrics: {
        maxDataPoints: MetricsTime.ONE_WEEK,
      },
      // drainDelay: 1000 * 60 * 2,
    });
    this.initWorkerListeners(this.worker);

    this.workerInsert = new Worker('debank-insert', this.workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 60 * 5,
      concurrency: 5000,
      limiter: {
        max: 100,
        duration: 1,
      },
      stalledInterval: 1000 * 60,
      maxStalledCount: 5,
      metrics: {
        maxDataPoints: MetricsTime.ONE_WEEK,
      },
      // drainDelay: 1000 * 60 * 2,
    });
    this.initWorkerListeners(this.workerInsert);

    this.workerWhale = new Worker('debank-whale', this.workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 60 * 5,
      concurrency: 5000,
      limiter: {
        max: 100,
        duration: 1,
      },
      stalledInterval: 1000 * 60,
      maxStalledCount: 5,
      metrics: {
        maxDataPoints: MetricsTime.ONE_WEEK,
      },
      // drainDelay: 1000 * 60 * 2,
    });
    this.initWorkerListeners(this.workerWhale);

    this.workerTopHolder = new Worker('debank-top-holder', this.workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 60 * 5,
      concurrency: 5000,
      limiter: {
        max: 100,
        duration: 1,
      },
      stalledInterval: 1000 * 60,
      maxStalledCount: 5,
      metrics: {
        maxDataPoints: MetricsTime.ONE_WEEK,
      },
      // drainDelay: 1000 * 60 * 2,
    });
    this.initWorkerListeners(this.workerTopHolder);

    this.workerRanking = new Worker('debank-ranking', this.workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 60 * 5,
      concurrency: 5000,
      limiter: {
        max: 100,
        duration: 1,
      },
      stalledInterval: 1000 * 60,
      maxStalledCount: 5,
      metrics: {
        maxDataPoints: MetricsTime.ONE_WEEK,
      },
      // drainDelay: 1000 * 60 * 2,
    });
    this.initWorkerListeners(this.workerRanking);

    this.logger.debug('info', '[initWorker:debank]', 'Worker initialized');
  }

  public async getCountOfJob(
    queue: keyof typeof this.queueName,
    jobTypes: JobType[] = ['delayed', 'waiting', 'active', 'completed', 'failed'],
  ) {
    return this.getQueue(this.queueName[queue]).getJobCounts(...jobTypes);
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
        backoff: { type: 'exponential', delay: 0.5 * 60 * 1000 },
        removeOnComplete: {
          // 1 hour
          age: 60 * 60 * 1,
        },
        removeOnFail: {
          age: 60 * 60 * 1,
        },
      },
    });

    const queueEvents = new QueueEvents('debank', {
      connection: this.redisConnection,
    });
    this.initQueueListeners(queueEvents);

    // TODO: REMOVE THIS LATER
    // this.addFetchProjectUsersJobs();

    this.queueInsert = new Queue('debank-insert', {
      connection: this.redisConnection,
      defaultJobOptions: {
        // The total number of attempts to try the job until it completes
        attempts: 5,
        // Backoff setting for automatic retries if the job fails
        backoff: { type: 'exponential', delay: 0.5 * 60 * 1000 },
        removeOnComplete: {
          // 1 hour
          age: 60 * 60,
        },
        removeOnFail: {
          // 1 hour
          age: 60 * 60,
        },
      },
    });
    const queueInsertEvents = new QueueEvents('debank-insert', {
      connection: this.redisConnection,
    });
    this.initQueueListeners(queueInsertEvents);

    this.queueWhale = new Queue('debank-whale', {
      connection: this.redisConnection,
      defaultJobOptions: {
        // The total number of attempts to try the job until it completes
        attempts: 5,
        // Backoff setting for automatic retries if the job fails
        backoff: { type: 'exponential', delay: 0.5 * 60 * 1000 },
        removeOnComplete: {
          age: 60 * 60,
        },
        removeOnFail: {
          age: 60 * 60,
        },
      },
    });
    const queueWhaleEvents = new QueueEvents('debank-whale', {
      connection: this.redisConnection,
    });
    this.initQueueListeners(queueWhaleEvents);

    this.queueTopHolder = new Queue('debank-top-holder', {
      connection: this.redisConnection,
      defaultJobOptions: {
        // The total number of attempts to try the job until it completes
        attempts: 5,
        // Backoff setting for automatic retries if the job fails
        backoff: { type: 'exponential', delay: 0.5 * 60 * 1000 },
        removeOnComplete: {
          age: 60 * 60,
        },
        removeOnFail: {
          age: 60 * 60,
        },
      },
    });
    const queueTopHolderEvents = new QueueEvents('debank-top-holder', {
      connection: this.redisConnection,
    });
    this.initQueueListeners(queueTopHolderEvents);

    this.queueRanking = new Queue('debank-ranking', {
      connection: this.redisConnection,
      defaultJobOptions: {
        // The total number of attempts to try the job until it completes
        attempts: 5,
        // Backoff setting for automatic retries if the job fails
        backoff: { type: 'exponential', delay: 0.5 * 60 * 1000 },
        removeOnComplete: {
          age: 60 * 60,
        },
        removeOnFail: {
          age: 60 * 60,
        },
      },
    });
    const queueRankingEvents = new QueueEvents('debank-insert', {
      connection: this.redisConnection,
    });
    this.initQueueListeners(queueRankingEvents);

    // TODO: ENABLE THIS
    this.initRepeatJobs();
  }
  /**
   * Initialize Worker listeners
   * @private
   */
  private initWorkerListeners(worker: Worker) {
    // Completed
    // worker.on('completed', ({ id, data, name }: Job<DebankJobData>) => {
    //   this.logger.discord('success', '[job:debank:completed]', id, name, JSON.stringify(data));
    // });
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
    worker.on('drained', async () => {
      const insertJobs = await this.queueInsert.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed');
      const whaleJobs = await this.queueWhale.getJobCounts();
      const topHolderJobs = await this.queueTopHolder.getJobCounts();
      const rankingJobs = await this.queueRanking.getJobCounts();
      const debankJobs = await this.queue.getJobCounts();
      // console.info('workerDrained');
      const notFinishedJobs = [insertJobs, whaleJobs, topHolderJobs, rankingJobs, debankJobs];
      const totalNotFinishedJobs = notFinishedJobs.reduce((acc, cur) => {
        return acc + cur.waiting + cur.active + cur.delayed;
      }, 0);
      // console.info({
      //   totalNotFinishedJobs,
      // });
      if (totalNotFinishedJobs - this.totalRepeatableJobs === 0) {
        const messageByRow =
          `\`\`\`diff` +
          `\n debank:` +
          `\n+ ${debankJobs.waiting} waiting` +
          `\n+ ${debankJobs.active} active` +
          `\n+ ${debankJobs.delayed} delayed` +
          `\n+ ${debankJobs.completed} completed` +
          `\n- ${debankJobs.failed} failed` +
          `\n debank whale:` +
          `\n+ ${whaleJobs.waiting} waiting` +
          `\n+ ${whaleJobs.active} active` +
          `\n+ ${whaleJobs.delayed} delayed` +
          `\n+ ${whaleJobs.completed} completed` +
          `\n+ ${whaleJobs.failed} failed` +
          `\n debank top holder:` +
          `\n+ ${topHolderJobs.waiting} waiting` +
          `\n+ ${topHolderJobs.active} active` +
          `\n+ ${topHolderJobs.delayed} delayed` +
          `\n+ ${topHolderJobs.completed} completed` +
          `\n- ${topHolderJobs.failed} failed` +
          `\n debank ranking:` +
          `\n+ ${rankingJobs.waiting} waiting` +
          `\n+ ${rankingJobs.active} active` +
          `\n+ ${rankingJobs.delayed} delayed` +
          `\n+ ${rankingJobs.completed} completed` +
          `\n- ${rankingJobs.failed} failed` +
          `\`\`\``;
        const discord = Container.get(DIDiscordClient);
        await discord.sendMsg({
          message: messageByRow,
        });
      }
    });
  }
  private initQueueListeners(queueEvents: QueueEvents) {
    queueEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      this.logger.discord('error', 'debank:Job failed', jobId, failedReason);
    });

    // queueEvents.on('drained', async (id) => {
    //   console.info({
    //     queueDrained: id,
    //   });
    //   const messageTable = table(
    //     arrayObjectToTable([
    //       {
    //         name: 'debank',
    //         ...(await this.getCountOfJob('debank')),
    //       },
    //       {
    //         name: 'top holder',
    //         ...(await this.getCountOfJob('debankTopHolder')),
    //       },
    //       {
    //         name: 'ranking',
    //         ...(await this.getCountOfJob('debankRanking')),
    //       },
    //       {
    //         name: 'whale',
    //         ...(await this.getCountOfJob('debankWhale')),
    //       },
    //     ]),
    //     {
    //       header: {
    //         content: 'Crawler queue debank',
    //       },
    //       columns: [
    //         {
    //           width: 10,
    //         },
    //         {
    //           width: 5,
    //         },
    //         {
    //           width: 7,
    //         },
    //         {
    //           width: 7,
    //         },
    //         {
    //           width: 6,
    //         },
    //         {
    //           width: 9,
    //         },
    //         {
    //           width: 6,
    //         },
    //         {
    //           width: 6,
    //         },
    //       ],
    //     },
    //   );
    //   console.info(messageTable);
    // });
    // queue.on('completed', ({ jobId }) => {
    //   this.logger.debug('success', 'Job completed', { jobId });
    // });
  }
  getQueue(id: string) {
    switch (id) {
      case 'debank':
        return this.queue;
      case 'debank-insert':
        return this.queueInsert;
      case 'debank-whale':
        return this.queueWhale;
      case 'debank-top-holder':
        return this.queueTopHolder;
      case 'debank-ranking':
        return this.queueRanking;
    }
  }
  private initRepeatJobs() {
    this.addJob({
      name: DebankJobNames['debank:create:partitions'],
      otps: {
        repeatJobKey: 'debank:create:partitions',
        jobId: `debank:create:partitions`,
        removeOnComplete: {
          //remove after 1 hour
          age: 60 * 60,
        },
        removeOnFail: {
          //remove after 1 day
          age: 60 * 60 * 24,
        },
        repeat: {
          //repeat every day
          every: 1000 * 60 * 60 * 24,
          // pattern: '* 0 0 * * *',
        },
        //delay for 5 minutes when the job is added for done other jobs
        delay: 1000 * 60 * 5,
        priority: 1,
        attempts: 5,
      },
    });
    this.addJob({
      name: DebankJobNames['debank:add:fetch:user-address:top-holders'],
      otps: {
        repeatJobKey: 'debank:add:fetch:user-address:top-holders',
        jobId: `debank:add:fetch:user-address:top-holders`,
        removeOnComplete: {
          //remove after 1 hour
          age: 60 * 60,
        },
        removeOnFail: {
          //remove after 1 hour
          age: 60 * 60 * 1,
        },
        repeat: {
          //repeat every 3 hours
          every: 1000 * 60 * 60 * 3,
          // pattern: '* 0 0 * * *',
        },
        //delay for 5 minutes when the job is added for done other jobs
        delay: 1000 * 60 * 5,
        priority: 3,
        attempts: 5,
      },
    });
    this.addJob({
      name: DebankJobNames['debank:add:fetch:coins'],
      otps: {
        repeatJobKey: 'debank:add:fetch:coins',
        repeat: {
          //repeat every 24 hours
          every: 1000 * 60 * 60 * 24,
          // pattern: '* 0 0 * * *',
        },
        priority: 1,
        attempts: 5,
      },
    });

    this.addJob({
      name: DebankJobNames['debank:add:fetch:top-holders'],
      otps: {
        repeatJobKey: 'debank:add:fetch:top-holders',
        jobId: `debank:add:fetch:top-holders`,
        removeOnComplete: {
          //remove after 1 hour
          age: 60 * 60 * 1,
        },
        removeOnFail: {
          //remove after 1 hour
          age: 60 * 60 * 1,
        },
        repeat: {
          //repeat every 60 minutes
          every: 1000 * 60 * 60 * 3,
          // pattern: '* 0 0 * * *',
        },
        priority: 2,
        attempts: 5,
      },
    });
    this.addJob({
      name: DebankJobNames['debank:add:social:users:rankings'],
      otps: {
        repeatJobKey: 'debank:add:social:users:rankings',
        jobId: `debank:add:social:users:rankings`,
        removeOnComplete: {
          //remove job after 1 hours
          age: 60 * 60 * 1,
        },
        removeOnFail: {
          //remove job after 1 hours
          age: 60 * 60 * 1,
        },
        repeat: {
          //repeat every 3 hours
          every: 1000 * 60 * 60 * 3,
          // pattern: '* 0 0 * * *',
        },
        priority: 2,
        attempts: 5,
      },
    });
    this.addJob({
      name: DebankJobNames['debank:add:fetch:whales:paging'],
      otps: {
        repeatJobKey: 'debank:add:fetch:whales:paging',
        jobId: `debank:add:fetch:whales:paging`,
        removeOnComplete: {
          //remove job after 1 hours
          age: 60 * 60 * 1,
        },
        removeOnFail: {
          //remove job after 1 hours
          age: 60 * 60 * 1,
        },
        repeat: {
          //repeat every 3 hours
          every: 1000 * 60 * 60 * 3,
        },
        priority: 2,
        attempts: 5,
      },
    });
  }
  /**
   * @description add job to queue
   */
  addJob({
    queue = this.queueName.debank,
    name,
    data = {},
    otps,
  }: {
    queue?: keyof typeof this.queueName;
    name: DebankJobNames;
    data?: any;
    otps: JobsOptions;
  }) {
    try {
      switch (queue) {
        case this.queueName.debankWhale:
          this.queueWhale.add(name, data, otps);
          break;
        case this.queueName.debankInsert:
          this.queueInsert.add(name, data, otps);
          break;
        case this.queueName.debankRanking:
          this.queueRanking.add(name, data, otps);
          break;
        case this.queueName.debankTopHolder:
          this.queueTopHolder.add(name, data, otps);
          break;

        case this.queueName.debank:
        default:
          this.queue.add(name, data, otps);
          break;
      }
    } catch (error) {
      this.logger.discord('error', `[addJob:debank:error]`, JSON.stringify(error), JSON.stringify(data));
    }
  }
  addBulkJobs({
    jobs,
    queue = this.queueName.debank,
  }: {
    queue: keyof typeof this.queueName;
    jobs: { name: DebankJobNames; data: any; otps: JobsOptions }[];
  }) {
    switch (queue) {
      case this.queueName.debankWhale:
        return this.queueWhale.addBulk(jobs);
      case this.queueName.debankInsert:
        return this.queueInsert.addBulk(jobs);
      case this.queueName.debankRanking:
        return this.queueRanking.addBulk(jobs);
      case this.queueName.debankTopHolder:
        return this.queueTopHolder.addBulk(jobs);
      case this.queueName.debank:
      default:
        return this.queue.addBulk(jobs);
    }
  }
  addInsertJob({ name, payload = {}, options }: { name: DebankJobNames; payload?: any; options?: JobsOptions }) {
    this.queueInsert
      .add(name, payload, options)
      // .then(({ id, name }) => this.logger.debug(`success`, `[addJob:success]`, { id, name, payload }))
      .catch((err) => this.logger.discord('error', `[addJob:error]`, JSON.stringify(err), JSON.stringify(payload)));
  }

  workerProcessor({ name, data = {}, id }: Job<any>): Promise<void> {
    // this.logger.discord('info', `[debank:workerProcessor:run]`, name);
    return (
      this.jobs[name as keyof typeof this.jobs]?.call(this, {
        jobId: id,
        ...((data && data) || {}),
      }) || this.jobs.default()
    );
  }
  async queryProjectList() {
    try {
      const { data, status } = await DebankAPI.fetch({
        endpoint: DebankAPI.Project.list.endpoint,
      });
      if (status !== 200) {
        throw new Error('queryProjectList: Error fetching project list');
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
        await this.pgPool.query(
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
        // .catch((err) => this.logger.discord('error', '[queryProjectList:insert]', JSON.stringify(err)));
      }
    } catch (error) {
      this.logger.discord('error', '[queryProjectList:error]', JSON.stringify(error));
      throw error;
    }
  }
  async addFetchProjectUsersJobs() {
    try {
      const { rows: projects } = await this.pgPool.query(`SELECT id FROM "debank-projects" GROUP BY id`);
      for (const { id } of projects) {
        this.addJob({
          name: DebankJobNames['debank:fetch:project:users'],
          data: {
            projectId: id,
          },
          otps: {
            jobId: `debank:fetch:project:users:${id}:${Date.now()}`,
            removeOnComplete: {
              age: 60 * 60,
            },
            removeOnFail: {
              age: 60 * 60,
            },
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
        await this.insertProjectUser({ projectId, share, usd_value, user_address });
      }
    } catch (error) {
      this.logger.discord('error', '[fetchProjectUsers:error]', JSON.stringify(error));
      throw error;
    }
  }

  async fetchUserBalanceList({ user_address }: { user_address: string }) {
    try {
      if (!user_address) {
        throw new Error('fetchUserBalanceList: userAddress is required');
      }
      const { data, status } = await DebankAPI.fetch({
        endpoint: DebankAPI.Token.cacheBalanceList.endpoint,
        params: {
          user_addr: user_address,
        },
      });
      if (status !== 200) {
        throw new Error('fetchUserBalanceList: Error fetching user balance list');
      }
      const { data: balance_list } = data;
      // console.log(balance_list);
      for (const {
        symbol,
        optimized_symbol,
        name: token_name,
        id: token_id,
        amount,
        price,
        protocol_id,
        updated_at,
        chain,
      } of balance_list) {
        await this.insertUserBalance({
          user_address,
          symbol,
          optimized_symbol,
          token_name,
          token_id,
          amount,
          price,
          protocol_id,
          updated_at,
          chain,
          is_stable_coin: STABLE_COINS.some((stableCoin) => stableCoin.symbol === symbol),
        });
      }
    } catch (error) {
      this.logger.discord('error', '[fetchUserBalanceList:error]', JSON.stringify(error));
      throw error;
    }
  }
  async insertProjectUser({
    projectId,
    share,
    usd_value,
    user_address,
  }: {
    projectId: string;
    share: any;
    usd_value: any;
    user_address: any;
  }) {
    await this.pgPool
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
      .catch((err) => this.logger.discord('error', '[debank:insertProjectUser]', JSON.stringify(err)));
  }
  async insertUserBalance({
    user_address,
    symbol,
    optimized_symbol,
    token_name,
    token_id,
    amount,
    price,
    protocol_id,
    chain,
    updated_at = new Date(),
    is_stable_coin = false,
  }: {
    user_address: string;
    symbol: string;
    optimized_symbol: string;
    token_name: string;
    token_id: string;
    amount: string;
    price: string;
    protocol_id: string;
    chain: string;
    updated_at: Date;
    is_stable_coin: boolean;
  }) {
    await this.pgPool
      .query(
        `INSERT INTO "debank-user-balance" (
            user_address,
            symbol,
            optimized_symbol,
            token_name,
            token_id,
            amount,
            price,
            protocol_id,
            chain,
            is_stable_coin,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          user_address,
          symbol,
          optimized_symbol,
          token_name,
          token_id,
          amount,
          price,
          protocol_id,
          chain,
          is_stable_coin,
          updated_at,
        ],
      )
      .catch((err) => this.logger.discord('error', '[debank:insertUserBalance]', JSON.stringify(err)));
  }
  async queryUserAddressByProjectId({ projectId }: { projectId: string }) {
    try {
      if (!projectId) {
        throw new Error('queryUserAddressByProjectId: projectId is required');
      }
      const { rows } = await this.pgPool.query(
        `SELECT user_address FROM "debank-project-users" WHERE project_id = $1 GROUP BY user_address`,
        [projectId],
      );
      return { rows };
    } catch (error) {
      this.logger.discord('error', '[queryUserAddressByProjectId:error]', JSON.stringify(error));
      throw error;
    }
  }
  async fetchSocialRankingsPage({
    page_num = 1,
    page_count = 50,
    crawl_id,
  }: {
    page_num: number;
    page_count?: number;
    crawl_id: number;
  }) {
    try {
      const {
        data: { data, error_code },
        status,
      } = await DebankAPI.fetch({
        endpoint: DebankAPI.Social.socialRanking.endpoint,
        params: {
          page_num,
          page_count,
        },
      });
      if (status !== 200 || error_code) {
        throw new Error('fetchSocialRankingsPage: Error fetching social ranking');
      }
      const { social_ranking_list } = data;
      const crawl_time = new Date();
      const rows = social_ranking_list.map(
        ({ id: user_address, rank, base_score, total_score, score_dict, value_dict }: any) => ({
          user_address,
          rank,
          base_score,
          total_score,
          score_dict,
          value_dict,
          crawl_id,
          crawl_time,
        }),
      );
      const pgp = Container.get(pgpToken);
      const cs = new pgp.helpers.ColumnSet(
        ['rank', 'base_score', 'score_dict', 'value_dict', 'total_score', 'crawl_time', 'crawl_id'],
        {
          table: 'debank-social-ranking',
        },
      );
      const onConflict = `UPDATE SET  ${cs.assignColumns({ from: 'EXCLUDED', skip: ['user_address'] })}`;
      await bulkInsertOnConflict({
        table: 'debank-social-ranking',
        data: rows,
        conflict: 'user_address',
        onConflict,
      });
    } catch (error) {
      this.logger.discord('error', '[fetchSocialRankingsPage:error]', JSON.stringify(error));
      throw error;
    }
  }
  async addFetchSocialRankingJob() {
    try {
      const crawl_id = await this.getSocialRankingCrawlId();
      const jobs: {
        name: DebankJobNames;
        data: any;
        otps: JobsOptions;
      }[] = [];
      for (let page_num = 1; page_num <= 1000; page_num++) {
        jobs.push({
          name: DebankJobNames['debank:fetch:social:rankings:page'],
          data: {
            page_num,
            crawl_id,
          },
          otps: {
            jobId: `debank:fetch:social:rankings:page:${page_num}:${crawl_id}`,
            removeOnComplete: {
              age: 60 * 60 * 1,
            },
            removeOnFail: {
              age: 60 * 60 * 1,
            },
            priority: 5,
            // delay: 1000 * 30,
          },
        });
      }
      await this.addBulkJobs({
        jobs,
        queue: this.queueName.debankRanking,
      });
    } catch (error) {
      this.logger.discord('error', '[addFetchSocialRankingJob:error]', JSON.stringify(error));
      throw error;
    }
  }
  async insertSocialRanking({
    user_address,
    rank,
    base_score,
    score_dict,
    value_dict,
    total_score,
  }: {
    user_address: string;
    rank: number;
    base_score: number;
    score_dict: any;
    value_dict: any;
    total_score: number;
  }) {
    await this.pgPool.query(
      `
        INSERT INTO "debank-social-ranking" (
          user_address,
          rank,
          base_score,
          score_dict,
          value_dict,
          total_score,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_address) DO UPDATE SET
          rank = $2,
          base_score = $3,
          score_dict = $4,
          value_dict = $5,
          total_score = $6,
          updated_at = $7
      `,
      [user_address, rank, base_score, score_dict, value_dict, total_score, new Date()],
    );

    // .catch((err) => this.logger.discord('error', '[debank:insertSocialRanking]', JSON.stringify(err)));
  }
  async querySocialRanking(
    {
      select = '*',
      limit = 10000,
      orderBy = 'rank',
      order = 'ASC',
    }: {
      select: string;
      limit: number;
      orderBy: string;
      order: 'DESC' | 'ASC';
    } = {
      select: '*',
      limit: 10000,
      orderBy: 'rank',
      order: 'ASC',
    },
  ) {
    const { rows } = await this.pgPool.query(
      `SELECT ${select} FROM "debank-social-ranking" ORDER BY ${orderBy} ${order} LIMIT ${limit}`,
    );
    return { rows };
  }
  async queryAddressList({
    select = '*',
    limit,
    orderBy = 'updated_at',
    order = 'DESC',
    where,
  }: {
    select?: string;
    limit?: number;
    orderBy?: string;
    where?: string;
    order?: 'DESC' | 'ASC';
  }) {
    const { rows } = await this.pgPool.query(
      `SELECT ${select} FROM "debank-user-address-list"
      ${where ? 'WHERE ' + where : ''}
      ORDER BY ${orderBy} ${order}  ${limit ? 'LIMIT ' + limit : ''}`,
    );
    return {
      rows,
    };
  }
  async fetchSocialRankingByUserAddress({ user_address, crawl_id }: { user_address: string; crawl_id: number }) {
    try {
      if (!user_address) {
        throw new Error('fetchSocialRankingByUserAddress: user_address is required');
      }
      const { balance_list } = await this.fetchUserTokenBalanceList({
        user_address,
      });
      const { project_list } = await this.fetchUserProjectList({
        user_address,
      });
      // const { coin_list, token_list } = await this.fetchUserAssetClassify({
      //   user_address,
      // });
      await this.insertUserAssetPortfolio({
        user_address,
        balance_list,
        project_list,
        coin_list: [],
        token_list: [],
        crawl_id,
      });
    } catch (error) {
      this.logger.discord('error', '[fetchSocialRankingByUserAddress:error]', JSON.stringify(error));
      throw error;
    }
  }

  async fetchUserProjectList({ user_address }: { user_address: string }) {
    try {
      if (!user_address) {
        throw new Error('fetchUserProjectList: user_address is required');
      }
      const { data: fetchProjectListData } = await DebankAPI.fetch({
        endpoint: DebankAPI.Portfolio.projectList.endpoint,
        params: {
          user_addr: user_address,
        },
      });

      const error_code = fetchProjectListData.error_code;
      if (error_code) {
        this.logger.debug('error', '[fetchUserProjectList:error]', JSON.stringify(error_code), {
          msg1: fetchProjectListData.error_msg,
        });
        throw new Error('fetchUserProjectList: Error fetching social ranking');
      }

      const { data: project_list } = fetchProjectListData;
      // await this.insertUserAssetPortfolio({ user_address, project_list, crawl_id });
      return {
        project_list,
      };
    } catch (error) {
      this.logger.discord('error', '[fetchUserProjectList:error]', JSON.stringify(error));
      throw error;
    }
  }

  async fetchUserAssetClassify({ user_address }: { user_address: string }) {
    try {
      if (!user_address) {
        throw new Error('fetchUserAssetClassify: user_address is required');
      }

      const { data: fetchAssetClassifyData } = await DebankAPI.fetch({
        endpoint: DebankAPI.Asset.classify.endpoint,
        params: {
          user_addr: user_address,
        },
      });

      const error_code = fetchAssetClassifyData.error_code;
      if (error_code) {
        this.logger.debug('error', '[fetchUserAssetClassify:error]', JSON.stringify(error_code), {
          msg2: fetchAssetClassifyData.error_msg,
        });
        throw new Error('fetchUserAssetClassify: Error fetching social ranking');
      }
      const {
        data: { coin_list, token_list },
      } = fetchAssetClassifyData;
      // await this.insertUserAssetPortfolio({ user_address, coin_list, token_list, crawl_id });
      return {
        coin_list,
        token_list,
      };
    } catch (error) {
      this.logger.discord('error', '[fetchUserAssetClassify:error]', JSON.stringify(error));
      throw error;
    }
  }

  async fetchUserTokenBalanceList({ user_address }: { user_address: string }) {
    try {
      if (!user_address) {
        throw new Error('fetchUserTokenBalanceList: user_address is required');
      }
      const { data: fetchTokenBalanceListData } = await DebankAPI.fetch({
        endpoint: DebankAPI.Token.cacheBalanceList.endpoint,
        params: {
          user_addr: user_address,
        },
      });

      const error_code = fetchTokenBalanceListData.error_code;
      if (error_code) {
        //TODO: handle error change this to discord
        this.logger.debug('error', '[fetchUserTokenBalanceList:error]', JSON.stringify(error_code), {
          msg3: fetchTokenBalanceListData.error_msg,
        });
        throw new Error('fetchUserTokenBalanceList: Error fetching social ranking');
      }

      const { data: balance_list } = fetchTokenBalanceListData;
      // await this.insertUserAssetPortfolio({ user_address, balance_list, crawl_id });
      return {
        balance_list,
      };
    } catch (error) {
      this.logger.discord('error', '[fetchUserTokenBalanceList:error]', JSON.stringify(error));
      throw error;
    }
  }

  async fetchWhaleList(
    {
      start = 0,
      limit = DebankAPI.Whale.list.params.limit,
      order_by = DebankAPI.Whale.list.params.order_by,
    }: {
      start: number;
      limit: number;
      order_by: string;
    } = DebankAPI.Whale.list.params,
  ) {
    try {
      const {
        data: { data, error_code },
        status,
      } = await DebankAPI.fetch({
        endpoint: DebankAPI.Whale.list.endpoint,
        params: {
          start,
          limit,
          order_by,
        },
      });
      if (status !== 200 || error_code) {
        // this.logger.discord(
        //   'error',
        //   '[fetchWhaleList:error]',
        //   JSON.stringify(data),
        //   JSON.stringify({ status, error_code }),
        // );
        throw new Error('fetchWhaleList: Error fetching social ranking');
      }
      const { whales, total_count } = data;
      return {
        whales,
        total_count,
        start,
        limit,
      };
    } catch (error) {
      this.logger.discord('error', '[fetchWhaleList:error]', JSON.stringify(error));
      throw error;
    }
  }

  async insertWhaleList({ whales, crawl_id }: { whales: any[]; crawl_id: number }) {
    try {
      //insert all whale list
      const data = whales.map((whale) => ({
        user_address: whale.id,
        details: JSON.stringify(whale).replace(/\\u0000/g, ''),
        crawl_id,
        crawl_time: new Date(),
      }));
      data.length &&
        (await bulkInsert({
          data,
          //TODO: change this to prod table
          table: 'debank-whales',
        }));
    } catch (error) {
      this.logger.discord('error', '[insertWhaleList:error]', JSON.stringify(error));
      throw error;
    }
  }

  async insertWhale({ whale, crawl_id, updated_at }: { whale: any; crawl_id: number; updated_at?: Date }) {
    await this.pgClient.query(
      `
          INSERT INTO "debank-whales" (
            user_address,
            details,
            crawl_id,
            updated_at
          )
          VALUES ($1, $2, $3, $4)
          `,
      [whale.id, JSON.stringify(whale), crawl_id, updated_at || new Date()],
    );
  }

  async fetchWhalesPage({ start, crawl_id }: { start: number; crawl_id: number }) {
    try {
      const { whales, total_count } = await this.fetchWhaleList({
        start,
        limit: DebankAPI.Whale.list.params.limit,
        order_by: DebankAPI.Whale.list.params.order_by,
      });
      if (!whales.length) {
        return;
      }
      //insert all whale list
      await this.insertWhaleList({ whales, crawl_id });
      //insert all address
      // this.insertUserAddressList({
      //   whales,
      //   debank_whales_time: new Date(),
      //   last_crawl_id: crawl_id,
      // });
    } catch (error) {
      this.logger.discord('error', '[fetchWhalesPage:error]', JSON.stringify(error));
      throw error;
    }
  }

  async addFetchWhalesPagingJob() {
    try {
      const crawl_id = await this.getWhalesCrawlId();

      const { whales, total_count } = await this.fetchWhaleList({
        start: 0,
        limit: DebankAPI.Whale.list.params.limit,
        order_by: DebankAPI.Whale.list.params.order_by,
      });

      //create list index from total count divine limit each list index will be a job
      const listIndex = Array.from(Array(Math.ceil(total_count / DebankAPI.Whale.list.params.limit))).reduce(
        (acc, _, index) => {
          acc.push(index * DebankAPI.Whale.list.params.limit);
          return acc;
        },
        [],
      );
      //create job for each list index
      const jobs: {
        name: DebankJobNames;
        data: any;
        otps: JobsOptions;
      }[] = listIndex.map((index: number) => ({
        name: DebankJobNames['debank:fetch:whales:page'],
        data: {
          start: index,
          crawl_id,
        },
        otps: {
          jobId: `debank:fetch:whales:page:${crawl_id}:${index}`,
          removeOnComplete: {
            // remove job after 1 hour
            age: 60 * 60 * 1,
          },
          removeOnFail: {
            age: 60 * 60 * 1,
          },
          priority: 5,
          attempts: 10,
        },
      }));
      await this.addBulkJobs({
        jobs,
        queue: this.queueName.debankWhale,
      });
      await this.insertWhaleList({ whales, crawl_id });
    } catch (error) {
      this.logger.discord('error', '[addFetchWhalesPagingJob:error]', JSON.stringify(error));
      throw error;
    }
  }
  async insertUserAssetPortfolio({
    user_address,
    token_list = [],
    coin_list = [],
    balance_list = [],
    project_list = [],
    crawl_id,
  }: {
    user_address: string;
    token_list?: any;
    coin_list?: any;
    balance_list?: any;
    project_list?: any;
    crawl_id: number;
  }) {
    try {
      const now = new Date();

      //   await pgClient.query(
      //     `
      //   INSERT INTO "debank-user-address-list" (
      //     user_address,
      //     last_crawl_id,
      //     debank_ranking_time,
      //     updated_at
      //   ) VALUES ($1, $2, $3, $4) ON CONFLICT (user_address) DO UPDATE SET updated_at = $4 , last_crawl_id = $2, debank_ranking_time = $3;
      // `,
      //     [user_address, crawl_id, now, now],
      //   );

      const tokens_rows = token_list.map((token: any) => ({
        user_address,
        details: JSON.stringify(token).replace(/\\u0000/g, ''),
        crawl_id,
        crawl_time: now,
      }));

      const coins_rows = coin_list.map((coin: any) => ({
        user_address,
        details: JSON.stringify(coin).replace(/\\u0000/g, ''),
        crawl_id,
        crawl_time: now,
      }));

      const balances_rows = balance_list.map((balance: any) => ({
        user_address,
        details: JSON.stringify({
          ...balance,
          is_stable_coin: STABLE_COINS.some((b: any) => b.symbol === balance.symbol),
        }).replace(/\\u0000/g, ''),
        is_stable_coin: STABLE_COINS.some((b: any) => b.symbol === balance.symbol),
        price: balance.price,
        symbol: balance.symbol,
        optimized_symbol: balance.optimized_symbol,
        amount: balance.amount,
        crawl_id,
        crawl_time: now,
        chain: balance.chain,
        usd_value: +balance.price * +balance.amount,
      }));

      const projects_rows = project_list.map((project: any) => ({
        user_address,
        details: JSON.stringify(project).replace(/\\u0000/g, ''),
        crawl_id,
        crawl_time: now,

        usd_value:
          project.portfolio_item_list?.reduce((acc: number, { stats }: any) => {
            return acc + stats.asset_usd_value;
          }, 0) || 0,
      }));

      tokens_rows.length &&
        (await bulkInsert({
          data: tokens_rows,
          table: 'debank-portfolio-tokens',
        }));

      coins_rows.length &&
        (await bulkInsert({
          data: coins_rows,
          table: 'debank-portfolio-coins',
        }));

      balances_rows.length &&
        (await bulkInsert({
          data: balances_rows,
          table: 'debank-portfolio-balances',
        }));

      projects_rows.length &&
        (await bulkInsert({
          data: projects_rows,
          table: 'debank-portfolio-projects',
        }));
    } catch (error) {
      // this.logger.error(
      //   'error',
      //   '[insertUserAssetPortfolio:error]',
      //   JSON.stringify(error),
      //   JSON.stringify({
      //     user_address,
      //     token_list,
      //     coin_list,
      //     balance_list,
      //     project_list,
      //   }),
      // );
      throw error;
    }
  }
  async addFetchSocialRankingByUsersAddressJob() {
    const { rows } = await this.querySocialRanking({
      select: 'user_address',
      //10000
      orderBy: 'rank',
      limit: 50000,
      order: 'DESC',
    });

    const crawl_id = await this.getCrawlId();
    const jobs = [];
    for (const { user_address } of rows) {
      jobs.push({
        name: DebankJobNames['debank:fetch:social:user'],
        data: {
          user_address,
          crawl_id,
        },
        otps: {
          jobId: `debank:fetch:social:user:${crawl_id}:${user_address}`,
          removeOnComplete: {
            age: 60 * 60,
          },
          removeOnFail: {
            age: 60 * 60 * 1,
          },
          priority: 15,
          attempts: 10,
        },
      });
    }
    this.addBulkJobs({
      jobs,
      queue: this.queueName.debank,
    });
  }
  async addFetchTopHoldersByUsersAddressJob({ jobId }: { jobId: string }) {
    const debankWhaleJobs = await this.queueWhale.getJobCounts();
    const debankTopHolderJobs = await this.queueTopHolder.getJobCounts();
    const debankRankingJobs = await this.queueRanking.getJobCounts();

    const totalJobs =
      debankWhaleJobs.active +
      debankWhaleJobs.delayed +
      debankWhaleJobs.waiting +
      debankWhaleJobs.wait +
      debankTopHolderJobs.active +
      debankTopHolderJobs.delayed +
      debankTopHolderJobs.waiting +
      debankTopHolderJobs.wait +
      debankRankingJobs.active +
      debankRankingJobs.delayed +
      debankRankingJobs.waiting +
      debankRankingJobs.wait;
    this.logger.info('info', 'totalJobs::', totalJobs);
    if (totalJobs > 0) {
      //delay 1 minutes until all jobs are done
      (await this.queue.getJob(jobId)).moveToDelayed(1000 * 60);
      return;
    }

    const { rows } = await this.queryAddressList({
      select: 'user_address',
    });

    const crawl_id = await this.getCrawlId();
    const jobs = rows.map(({ user_address }: any) => ({
      name: DebankJobNames['debank:fetch:social:user'],
      data: {
        user_address,
        crawl_id,
      },
      otps: {
        jobId: `debank:fetch:social:user:${crawl_id}:${user_address}`,
        removeOnComplete: {
          age: 60 * 30,
        },
        removeOnFail: {
          age: 60 * 30,
        },
        priority: 10,
        attempts: 10,
      },
    }));
    await this.addBulkJobs({
      jobs,
      queue: this.queueName.debank,
    });
  }

  async getCrawlId() {
    const { rows } = await this.pgClient.query(`
      SELECT
        max(last_crawl_id) as last_crawl_id
      FROM
        "debank-user-address-list"
    `);
    if (rows[0]?.last_crawl_id && rows[0].last_crawl_id) {
      const last_crawl_id = rows[0].last_crawl_id;
      const last_crawl_id_date = last_crawl_id.slice(0, 8);
      const last_crawl_id_number = parseInt(last_crawl_id.slice(8));
      if (last_crawl_id_date === formatDate(new Date(), 'YYYYMMDD')) {
        return `${last_crawl_id_date}${
          last_crawl_id_number + 1 >= 10 ? last_crawl_id_number + 1 : '0' + (last_crawl_id_number + 1)
        }`;
      } else {
        return `${formatDate(new Date(), 'YYYYMMDD')}01`;
      }
    } else {
      return `${formatDate(new Date(), 'YYYYMMDD')}01`;
    }
  }
  async getWhalesCrawlId() {
    const { rows } = await this.pgClient.query(`
  	  SELECT
        max(crawl_id) as crawl_id
      FROM
        "debank-whales"
    `);
    if (rows[0]?.crawl_id && rows[0].crawl_id) {
      const crawl_id = rows[0].crawl_id;
      const crawl_id_date = crawl_id.slice(0, 8);
      const crawl_id_number = parseInt(crawl_id.slice(8));
      if (crawl_id_date === formatDate(new Date(), 'YYYYMMDD')) {
        return +`${crawl_id_date}${crawl_id_number + 1 >= 10 ? crawl_id_number + 1 : '0' + (crawl_id_number + 1)}`;
      } else {
        return +`${formatDate(new Date(), 'YYYYMMDD')}01`;
      }
    } else {
      return +`${formatDate(new Date(), 'YYYYMMDD')}01`;
    }
  }
  async getTopHoldersCrawlId() {
    const { rows } = await this.pgClient.query(`
      SELECT
        max(crawl_id) as crawl_id
      FROM
        "debank-top-holders"
    `);
    if (rows[0]?.crawl_id && rows[0].crawl_id) {
      const crawl_id = rows[0].crawl_id;
      const crawl_id_date = crawl_id.slice(0, 8);
      const crawl_id_number = parseInt(crawl_id.slice(8));
      if (crawl_id_date === formatDate(new Date(), 'YYYYMMDD')) {
        return `${crawl_id_date}${crawl_id_number + 1 >= 10 ? crawl_id_number + 1 : '0' + (crawl_id_number + 1)}`;
      } else {
        return `${formatDate(new Date(), 'YYYYMMDD')}01`;
      }
    } else {
      return `${formatDate(new Date(), 'YYYYMMDD')}01`;
    }
  }

  async getCoinsCrawlId() {
    const { rows } = await this.pgClient.query(`
    SELECT
        max(crawl_id) as crawl_id
    FROM
      "debank-coins"
    `);
    if (rows[0]?.crawl_id && rows[0].crawl_id) {
      const crawl_id = rows[0].crawl_id;
      const crawl_id_date = crawl_id.slice(0, 8);
      const crawl_id_number = parseInt(crawl_id.slice(8));
      if (crawl_id_date === formatDate(new Date(), 'YYYYMMDD')) {
        return `${crawl_id_date}${crawl_id_number + 1 >= 10 ? crawl_id_number + 1 : '0' + (crawl_id_number + 1)}`;
      } else {
        return `${formatDate(new Date(), 'YYYYMMDD')}1`;
      }
    } else {
      return `${formatDate(new Date(), 'YYYYMMDD')}1`;
    }
  }

  async getSocialRankingCrawlId() {
    const { rows } = await this.pgClient.query(`
    SELECT
        max(crawl_id) as crawl_id
    FROM
      "debank-social-ranking"
    `);
    if (rows[0]?.crawl_id && rows[0].crawl_id) {
      const crawl_id = rows[0].crawl_id;
      const crawl_id_date = crawl_id.slice(0, 8);
      const crawl_id_number = parseInt(crawl_id.slice(8));
      if (crawl_id_date === formatDate(new Date(), 'YYYYMMDD')) {
        return `${crawl_id_date}${crawl_id_number + 1 >= 10 ? crawl_id_number + 1 : '0' + (crawl_id_number + 1)}`;
      } else {
        return `${formatDate(new Date(), 'YYYYMMDD')}01`;
      }
    } else {
      return `${formatDate(new Date(), 'YYYYMMDD')}01`;
    }
  }
  async insertUserAddress({
    user_address,
    updated_at,
    debank_whales_time,
    debank_top_holders_time,
    debank_ranking_time,
  }: {
    user_address: string;
    updated_at: Date;
    debank_whales_time: Date;
    debank_top_holders_time: Date;
    debank_ranking_time: Date;
  }) {
    const now = new Date();
    // update if exists else insert
    await this.pgClient.query(
      `
      INSERT INTO "debank-user-address-list"(
        user_address,
        debank_whales_time,
        debank_top_holders_time,
        debank_ranking_time
      )
      VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_address) DO UPDATE SET
        debank_whales_time = COALESCE(NULLIF($2,''), "debank-user-address-list".debank_whales_time),
        debank_top_holders_time = COALESCE(NULLIF($3,''), "debank-user-address-list".debank_top_holders_time),
        debank_ranking_time = COALESCE(NULLIF($4,''), "debank-user-address-list".debank_ranking_time)
    `,
      [user_address, debank_whales_time, debank_top_holders_time, debank_ranking_time, now],
    );
  }

  async fetchCoins() {
    try {
      const {
        data: { data, error_code },
        status,
      } = await DebankAPI.fetch({
        endpoint: DebankAPI.Coin.list.endpoint,
      });
      if (status !== 200 || error_code) {
        // this.logger.discord(
        //   'error',
        //   '[fetchCoins:error]',
        //   JSON.stringify(data),
        //   JSON.stringify({ status, error_code }),
        // );
        throw new Error('fetchCoins:error');
      }
      const { coins } = data;
      return {
        coins,
      };
    } catch (error) {
      this.logger.error('error', '[fetchCoins:error]', JSON.stringify(error));
      throw error;
    }
  }
  async fetchTopHoldersPage({
    id,
    start = 0,
    limit = DebankAPI.Coin.top_holders.params.limit,
    crawl_id,
  }: {
    id: string;
    start: number;
    limit: number;
    crawl_id: number;
  }) {
    try {
      const {
        data: { data, error_code },
        status,
      } = await DebankAPI.fetch({
        endpoint: DebankAPI.Coin.top_holders.endpoint,
        params: {
          id,
          start,
          limit,
        },
        config: {
          headers: {
            account,
          },
        },
      });
      if (status !== 200 || error_code) {
        // this.logger.discord(
        //   'error',
        //   '[fetchTopHolders:error]',
        //   JSON.stringify(data),
        //   JSON.stringify({ status, error_code }),
        // );
        throw new Error('fetchTopHolders:error');
      }
      const { holders } = data;
      await this.insertTopHolders({
        holders,
        crawl_id,
        symbol: id,
      });
      return {
        holders,
      };
    } catch (error) {
      this.logger.error('error', '[fetchTopHolders:error]', JSON.stringify(error));
      throw error;
    }
  }
  async fetchTopHolders({ id, crawl_id }: { id: string; crawl_id: number }) {
    try {
      const {
        data: { data, error_code },
        status,
      } = await DebankAPI.fetch({
        endpoint: DebankAPI.Coin.top_holders.endpoint,
        params: {
          id,
        },
        config: {
          headers: {
            account,
          },
        },
      });
      if (status !== 200 || error_code) {
        // this.logger.discord(
        //   'error',
        //   '[fetchTopHolders:error]',
        //   JSON.stringify(data),
        //   JSON.stringify({ status, error_code }),
        // );
        throw new Error('fetchTopHolders:error');
      }
      const { total_count, holders } = data;

      const listIndex = Array.from(Array(Math.ceil(total_count / DebankAPI.Coin.top_holders.params.limit))).reduce(
        (acc, _, index) => {
          acc.push(index * DebankAPI.Coin.top_holders.params.limit);
          return acc;
        },
        [],
      );

      listIndex.map((index: number) => {
        if (index === 0) return;
        this.addJob({
          queue: this.queueName.debankTopHolder,
          name: DebankJobNames['debank:fetch:top-holders:page'],
          data: {
            id,
            start: index,
            limit: DebankAPI.Coin.top_holders.params.limit,
            crawl_id,
          },
          otps: {
            jobId: `debank:fetch:top-holders:page:${crawl_id}:${id}:${index}`,
            removeOnComplete: true,
            removeOnFail: {
              age: 60 * 60 * 1,
            },
            priority: 7,
            attempts: 10,
          },
        });
      });
      await this.insertTopHolders({
        holders,
        crawl_id,
        symbol: id,
      });
    } catch (error) {
      this.logger.error('error', '[fetchTopHolders:error]', JSON.stringify(error));
      throw error;
    }
  }
  async addFetchTopHoldersJob() {
    try {
      const crawl_id = await this.getTopHoldersCrawlId();
      const allCoins = await this.queryAllCoins();
      //164
      const jobs = allCoins.map(({ symbol }) => ({
        name: DebankJobNames['debank:fetch:top-holders'],
        data: {
          id: symbol,
          crawl_id,
        },
        otps: {
          jobId: `debank:fetch:top-holders:${crawl_id}:${symbol}`,
          removeOnComplete: {
            age: 60 * 60 * 1,
          },
          removeOnFail: {
            age: 60 * 60 * 1,
          },
          priority: 5,
          // delay: 1000 * 10,
          attempts: 10,
        },
      }));
      await this.addBulkJobs({
        queue: this.queueName.debankTopHolder,
        jobs,
      });
    } catch (error) {
      this.logger.error('error', '[addFetchTopHoldersJob:error]', JSON.stringify(error));
      throw error;
    }
  }

  async addFetchCoinsJob() {
    try {
      const crawl_id = await this.getCoinsCrawlId();

      const {
        data: { data, error_code },
        status,
      } = await DebankAPI.fetch({
        endpoint: DebankAPI.Coin.list.endpoint,
      });
      if (status !== 200 || error_code) {
        // this.logger.discord(
        //   'error',
        //   '[addFetchCoinsJob:error]',
        //   JSON.stringify(data),
        //   JSON.stringify({ status, error_code }),
        // );
        throw new Error('addFetchCoinsJob:error');
      }
      const { coins } = data;
      this.insertCoins({
        coins,
        crawl_id,
      });
    } catch (error) {
      this.logger.error('error', '[addFetchCoinsJob:error]', JSON.stringify(error));
      throw error;
    }
  }

  async insertCoins({ coins, crawl_id }: { coins: any[]; crawl_id: string }) {
    try {
      const data = coins.map((coin) => ({
        details: JSON.stringify(coin),
        crawl_id,
        crawl_time: new Date(),
        cg_id: coin.id,
      }));
      data.length &&
        (await bulkInsert({
          table: 'debank-coins',
          data,
        }));
    } catch (error) {
      this.logger.error('error', '[insertCoins:error]', JSON.stringify(error));
      throw error;
    }
  }

  async insertCoin({ coin, crawl_id, crawl_time }: { coin: any; crawl_id: number; crawl_time: Date }) {
    try {
      await this.pgClient.query(
        `
        INSERT INTO "debank-coins"(
          symbol,
          crawl_id,
          details,
          crawl_time
        )
        VALUES ($1, $2, $3, $4) ON CONFLICT (symbol) DO UPDATE
          SET details = $3, crawl_time = $4, crawl_id = $2
      `,
        [coin.symbol, crawl_id, JSON.stringify(coin), crawl_time ?? new Date()],
      );
    } catch (error) {
      this.logger.error('error', '[insertCoin:error]', JSON.stringify(error));
      throw error;
    }
  }
  async queryAllCoins() {
    try {
      const { rows } = await this.pgClient.query(`
        SELECT symbol, details FROM "debank-coins"
      `);
      return rows;
    } catch (error) {
      this.logger.error('error', '[queryAllCoins:error]', JSON.stringify(error));
      throw error;
    }
  }
  async insertTopHolders({ holders, crawl_id, symbol }: { holders: any[]; crawl_id: number; symbol: string }) {
    try {
      const crawl_time = new Date();
      //TODO: filter out holders that already exist
      //!: remove this and replace by trigger
      // const { rows } = await this.queryTopHoldersByCrawlId({
      //   symbol,
      //   crawl_id,
      // });
      const values = holders.map((holder) => ({
        symbol,
        details: JSON.stringify(holder),
        user_address: holder.id,
        crawl_id,
        crawl_time,
      }));
      values.length &&
        (await bulkInsert({
          data: values,
          table: 'debank-top-holders',
        }));
    } catch (error) {
      this.logger.error('error', '[insertTopHolders:error]', JSON.stringify(error));
      throw error;
    }
  }
  async insertTopHolder({
    symbol,
    user_address,
    holder,
    crawl_id,
    crawl_time,
  }: {
    user_address: string;
    holder: any;
    crawl_id: number;
    crawl_time: Date;
    symbol: string;
  }) {
    try {
      await this.pgClient.query(
        `
        INSERT INTO "debank-top-holders"(
          user_address,
          crawl_id,
          details,
          symbol,
          crawl_time)
        VALUES ($1, $2, $3, $4, $5)
      `,
        [user_address, crawl_id, JSON.stringify(holder), symbol, crawl_time ?? new Date()],
      );
    } catch (error) {
      // this.logger.error('error', '[insertTopHolder:error]', JSON.stringify(error));
      throw error;
    }
  }
  async queryTopHoldersByCrawlId({ symbol, crawl_id }: { symbol: string; crawl_id: number }) {
    try {
      const { rows } = await this.pgClient.query(
        `
        SELECT * FROM "debank-top-holders" WHERE symbol = $1 AND crawl_id = $2
      `,
        [symbol, crawl_id],
      );
      return { rows };
    } catch (error) {
      this.logger.error('error', '[queryTopHolders:error]', JSON.stringify(error));
      throw error;
    }
  }
  private async createPartitions() {
    const tables = ['debank-portfolio-balances', 'debank-portfolio-projects'];
    await Promise.all(
      tables.map((table) =>
        createPartitionsInDateRange({
          table,
          max_list_partition: this.maxCrawlIdInOneDay,
        }),
      ),
    );
  }
  async cleanOutdatedData() {
    //truncate table not today
    const tables = ['debank-portfolio-balances', 'debank-portfolio-projects'];
    await Promise.all(tables.map((table) => this.truncatePartitions({ table })));
  }

  async truncatePartitions({ table, days = 7 }: { table: string; days?: number }) {
    try {
      const now = formatDate(new Date(), 'YYYYMMDD');
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = formatDate(date, 'YYYYMMDD');
        if (dateStr === now) {
          continue;
        }
        ///diff days
        // const diff = Math.abs(date.getTime() - new Date().getTime());
        //truncate by crawl_id
        for (let j = 1; j <= this.maxCrawlIdInOneDay; j++) {
          if (this.keepCrawlIds.includes(j)) {
            continue;
          }
          await truncateTable({
            table: `${table}-${dateStr}${j >= 10 ? j : `0${j}`}`,
          });
        }
      }
    } catch (error) {
      this.logger.error('error', '[truncatePartitions:error]', JSON.stringify(error));
      throw error;
    }
  }
}
