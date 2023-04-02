import Container, { Token } from 'typedi';
import { Logger } from '../../core/logger';
import { Job, JobType, JobsOptions, MetricsTime, Queue, Worker } from 'bullmq';
import { env } from 'process';
import bluebird from 'bluebird';
import { DIRedisConnection } from '../../loaders/redis.loader';

import { DebankJobData, DebankJobNames } from './debank.job';
import { DebankAPI } from '../../common/api';
import { pgpToken } from '../../loaders/pg.loader';

import { formatDate } from '../../utils/date';
import { bulkInsertOnConflict, createPartitionsInDateRange, truncateAndDropTable } from '../../utils/pg';
import { DIDiscordClient } from '../../loaders/discord.loader';
import { sleep } from '../../utils/common';
import { WEBSHARE_PROXY_HTTP, WEBSHARE_PROXY_RANKING_WHALE_TOPHOLDERS_HTTP } from '../../common/proxy';
import { uniqBy } from 'lodash';
import {
  bulkWriteUsersProject,
  getDebankCoinsCrawlId,
  getDebankCrawlId,
  getDebankSocialRankingCrawlId,
  getDebankTopHoldersCrawlId,
  getDebankWhalesCrawlId,
  insertDebankCoin,
  insertDebankCoins,
  insertDebankPools,
  insertDebankPoolsToMongo,
  insertDebankTopHolder,
  insertDebankTopHolders,
  insertDebankUserAddress,
  insertDebankUserAssetPortfolio,
  insertDebankWhale,
  insertDebankWhaleList,
  pageDebankFetchProfileAPI,
  queryDebankAllCoins,
  queryDebankProtocols,
  queryDebankTopHoldersImportantToken,
  updateDebankUserProfile,
} from './debank.fnc';
import { initQueue, initQueueListeners } from '../../utils/bullmq';
import { workerProcessor } from './debank.process';
import { connectChrome, createPuppeteerBrowser } from '../../service/puppeteer/utils';
const account =
  '{"random_at":1668662325,"random_id":"9ecb8cc082084a3ca0b7701db9705e77","session_id":"34dea485be2848cfb0a72f966f05a5b0","user_addr":"0x2f5076044d24dd686d0d9967864cd97c0ee1ea8d","wallet_type":"metamask","is_verified":true}';
const current_address = '0x2f5076044d24dd686d0d9967864cd97c0ee1ea8d';
const connected_dict =
  '{"0x2f5076044d24dd686d0d9967864cd97c0ee1ea8d":{"walletType":"metamask","sessionId":"34dea485be2848cfb0a72f966f05a5b0","detail":{"account_id":"Tian","avatar":null,"comment":null,"create_at":1674790367,"desc":{"born_at":1674790367,"cex":{},"contract":{},"id":"0x2f5076044d24dd686d0d9967864cd97c0ee1ea8d","is_danger":null,"is_spam":null,"name":null,"org":{},"protocol":{},"tags":[],"thirdparty_names":{},"usd_value":15.859135222052371,"user":{"logo_is_nft":false,"logo_thumbnail_url":"","logo_url":"","memo":null,"web3_id":"Tian"}},"email_verified":false,"follower_count":1,"following_count":0,"id":"0x2f5076044d24dd686d0d9967864cd97c0ee1ea8d","is_contract":false,"is_editor":false,"is_followed":false,"is_following":false,"is_mine":false,"is_mirror_author":false,"is_multisig_addr":false,"market_status":null,"org":{},"protocol_usd_value":0,"relation":null,"tvf":0,"usd_value":15.859135222052371,"used_chains":["eth"],"wallet_usd_value":15.859135222052371}}}';
const browser_uid = '{"random_at":1668662325,"random_id":"9ecb8cc082084a3ca0b7701db9705e77"}';

export const debankServiceToken = new Token<DebankService>('_debankService');

export class DebankService {
  private logger = new Logger('Debank');

  private readonly redisConnection = Container.get(DIRedisConnection);

  private worker: Worker;

  private workerInsert: Worker;

  private workerWhale: Worker;

  private workerTopHolder: Worker;

  private workerRanking: Worker;

  private workerCommon: Worker;

  private queue: Queue;

  private queueInsert: Queue;

  private queueWhale: Queue;

  private queueTopHolder: Queue;

  private queueRanking: Queue;

  private queueCommon: Queue;

  // TODO: adjust this value
  readonly totalRepeatableJobs = 6;

  readonly maxCrawlIdInOneDay = 12;

  readonly keepCrawlIds = [1, 5];

  private count = 0;

  private readonly jobs: {
    [key in DebankJobNames | 'default']?: (payload?: any) => any;
  } = {
    // 'debank:fetch:social:user': this.fetchSocialRankingByUserAddress,
    // 'debank:fetch:user:project-list': this.fetchUserProjectList,
    // 'debank:fetch:user:assets-portfolios': this.fetchUserAssetClassify,
    // 'debank:fetch:user:token-balances': this.fetchUserTokenBalanceList,

    'debank:fetch:social:rankings:page': this.fetchSocialRankingsPage,
    'debank:fetch:whales:page': this.fetchWhalesPage,
    'debank:insert:whale': insertDebankWhale,
    'debank:insert:user-address': insertDebankUserAddress,
    'debank:insert:user-assets-portfolio': insertDebankUserAssetPortfolio,
    'debank:insert:coin': insertDebankCoin,
    'debank:fetch:top-holders': this.fetchTopHolders,
    'debank:fetch:top-holders:page': this.fetchTopHoldersPage,
    'debank:insert:top-holder': insertDebankTopHolder,
    // 'debank:crawl:portfolio': this.crawlPortfolio,

    'debank:crawl:portfolio:list': this.crawlPortfolioByList,

    'debank:crawl:users:project': this.crawlPortfolioByList,

    //! DEPRECATED
    // 'debank:add:project:users': this.addFetchProjectUsersJobs,

    //!PAUSED
    'debank:add:fetch:coins': this.addFetchCoinsJob,

    // 'debank:add:social:users': this.addFetchSocialRankingByUsersAddressJob,
    //! RUNNING
    'debank:add:social:users:rankings': this.addFetchSocialRankingJob,
    //! RUNNING
    'debank:add:fetch:whales:paging': this.addFetchWhalesPagingJob,
    //! RUNNING
    'debank:add:fetch:top-holders': this.addFetchTopHoldersJob,
    //! RUNNING
    'debank:add:fetch:user-address:top-holders': this.addFetchTopHoldersByUsersAddressJob,

    'debank:crawl:top-holders': this.crawlTopHolders,

    'debank:add:fetch:protocols:pools': this.addFetchProtocolPoolsJob,

    'debank:fetch:protocols:pools:page': this.fetchProtocolPoolsPage,

    'debank:add:fetch:protocols:pools:id': this.addFetchProtocolPoolsById,

    //* PARTITION JOBS
    'debank:create:partitions': this.createPartitions,

    'debank:clean:outdated-data': this.cleanOutdatedData,
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
    debankCommon: 'debank-common',
  };

  constructor() {
    // this.crawlUsersProject({
    //   user_addresses: ['0xbdfa4f4492dd7b7cf211209c4791af8d52bf5c50'],
    //   crawl_id: '0',
    // }).then((res) => {
    //   console.log('res', res);
    // });
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
    this.worker = new Worker('debank', workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 60 * 2.5,
      concurrency: 5,
      stalledInterval: 1000 * 30,
      skipLockRenewal: true,
      maxStalledCount: 5,
      metrics: {
        maxDataPoints: MetricsTime.ONE_WEEK,
      },
    });
    this.initWorkerListeners(this.worker);

    this.workerInsert = new Worker('debank-insert', workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 60,
      concurrency: 200,
      limiter: {
        max: 500,
        duration: 1000,
      },
      stalledInterval: 1000 * 60,
      maxStalledCount: 5,
      metrics: {
        maxDataPoints: MetricsTime.ONE_WEEK,
      },
    });
    this.initWorkerListeners(this.workerInsert);

    this.workerWhale = new Worker('debank-whale', workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 60,
      concurrency: 5,
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
    this.initWorkerListeners(this.workerWhale);

    this.workerTopHolder = new Worker('debank-top-holder', workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 60 * 2.5,
      skipLockRenewal: true,
      concurrency: 5,
      stalledInterval: 1000 * 60,
      maxStalledCount: 5,
      metrics: {
        maxDataPoints: MetricsTime.ONE_WEEK,
      },
    });
    this.initWorkerListeners(this.workerTopHolder);

    this.workerRanking = new Worker('debank-ranking', workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 60,
      concurrency: 5,
      limiter: {
        max: 50,
        duration: 1000,
      },
      stalledInterval: 1000 * 60,
      maxStalledCount: 5,
      metrics: {
        maxDataPoints: MetricsTime.ONE_WEEK,
      },
    });
    this.initWorkerListeners(this.workerRanking);

    this.workerCommon = new Worker('debank-common', workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 60 * 5,
      concurrency: 5,
      limiter: {
        max: 60,
        duration: 60 * 1000,
      },
      stalledInterval: 1000 * 60,
      maxStalledCount: 5,
      metrics: {
        maxDataPoints: MetricsTime.ONE_WEEK,
      },
    });
    this.initWorkerListeners(this.workerCommon);

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
    this.queue = initQueue({
      queueName: 'debank',
      opts: {
        connection: this.redisConnection,
        defaultJobOptions: {
          // The total number of attempts to try the job until it completes
          attempts: 10,
          // delay: 1000 * 2,
          // Backoff setting for automatic retries if the job fails
          backoff: { type: 'exponential', delay: 10 * 1000 },
          removeOnComplete: {
            // 1 hour
            age: 60 * 60 * 6,
          },
          removeOnFail: {
            age: 60 * 60 * 6,
          },
        },
      },
    });

    initQueueListeners({ queueName: 'debank', opts: { connection: this.redisConnection } });
    this.queueInsert = initQueue({
      queueName: 'debank-insert',
      opts: {
        connection: this.redisConnection,
        defaultJobOptions: {
          // The total number of attempts to try the job until it completes
          attempts: 5,
          // Backoff setting for automatic retries if the job fails
          backoff: { type: 'exponential', delay: 10 * 1000 },
          removeOnComplete: {
            // 3 hour
            age: 60 * 60 * 1,
          },
          removeOnFail: {
            // 3 hour
            age: 60 * 60 * 1,
          },
        },
      },
    });

    initQueueListeners({ queueName: 'debank-insert', opts: { connection: this.redisConnection } });

    this.queueWhale = initQueue({
      queueName: 'debank-whale',
      opts: {
        connection: this.redisConnection,
        defaultJobOptions: {
          // The total number of attempts to try the job until it completes
          attempts: 10,
          // Backoff setting for automatic retries if the job fails
          backoff: { type: 'exponential', delay: 10 * 1000 },
          removeOnComplete: {
            age: 60 * 60 * 3,
          },
          removeOnFail: {
            age: 60 * 60 * 3,
          },
        },
      },
    });

    initQueueListeners({ queueName: 'debank-whale', opts: { connection: this.redisConnection } });
    this.queueTopHolder = initQueue({
      queueName: 'debank-top-holder',
      opts: {
        connection: this.redisConnection,
        defaultJobOptions: {
          // The total number of attempts to try the job until it completes
          attempts: 10,
          // Backoff setting for automatic retries if the job fails
          backoff: { type: 'exponential', delay: 10 * 1000 },
          removeOnComplete: {
            age: 60 * 60 * 3,
          },
          removeOnFail: {
            age: 60 * 60 * 3,
          },
        },
      },
    });

    initQueueListeners({ queueName: 'debank-top-holder', opts: { connection: this.redisConnection } });

    this.queueRanking = initQueue({
      queueName: 'debank-ranking',
      opts: {
        connection: this.redisConnection,
        defaultJobOptions: {
          // The total number of attempts to try the job until it completes
          attempts: 10,
          // Backoff setting for automatic retries if the job fails
          backoff: { type: 'exponential', delay: 10 * 1000 },
          removeOnComplete: {
            age: 60 * 60 * 3,
          },
          removeOnFail: {
            age: 60 * 60 * 3,
          },
        },
      },
    });

    initQueueListeners({ queueName: 'debank-insert', opts: { connection: this.redisConnection } });

    this.queueCommon = initQueue({
      queueName: 'debank-common',
      opts: {
        connection: this.redisConnection,
      },
    });
    initQueueListeners({ queueName: 'debank-common', opts: { connection: this.redisConnection } });

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
      const insertJobs = await this.queueInsert.getJobCounts();
      const whaleJobs = await this.queueWhale.getJobCounts();
      const topHolderJobs = await this.queueTopHolder.getJobCounts();
      const rankingJobs = await this.queueRanking.getJobCounts();
      const debankJobs = await this.queue.getJobCounts();
      const debankCommonJobs = await this.queueCommon.getJobCounts();
      // console.info('workerDrained');
      const discord = Container.get(DIDiscordClient);

      const notFinishedJobs = [
        insertJobs,
        whaleJobs,
        topHolderJobs,
        rankingJobs,
        debankJobs,
        insertJobs,
        debankCommonJobs,
      ];
      const totalNotFinishedJobs = notFinishedJobs.reduce((acc, cur) => {
        return acc + cur.waiting + cur.active + cur.delayed;
      }, 0);
      const messageByRow =
        `\`\`\`diff` +
        `\n 🔴 debank:` +
        `\n+ ${debankJobs.waiting} waiting` +
        `\n+ ${debankJobs.active} active` +
        `\n+ ${debankJobs.delayed} delayed` +
        `\n+ ${debankJobs.completed} completed` +
        `\n- ${debankJobs.failed} failed` +
        `\n⏩ is running: ${this.worker.isRunning()}` +
        `\n⏸️ is pause: ${await this.queue.isPaused()}` +
        `\n⏯️ next_Job: ${(await this.worker.getNextJob('debank'))?.id}` +
        `\n 🔴 debank whale:` +
        `\n+ ${whaleJobs.waiting} waiting` +
        `\n+ ${whaleJobs.active} active` +
        `\n+ ${whaleJobs.delayed} delayed` +
        `\n+ ${whaleJobs.completed} completed` +
        `\n+ ${whaleJobs.failed} failed` +
        `\n⏩ is running: ${this.workerWhale.isRunning()}` +
        `\n⏸️ is pause: ${await this.queueWhale.isPaused()}` +
        `\n⏯️ next_Job: ${(await this.workerWhale.getNextJob('debank-whale'))?.id}` +
        `\n 🔴 debank top holder:` +
        `\n+ ${topHolderJobs.waiting} waiting` +
        `\n+ ${topHolderJobs.active} active` +
        `\n+ ${topHolderJobs.delayed} delayed` +
        `\n+ ${topHolderJobs.completed} completed` +
        `\n- ${topHolderJobs.failed} failed` +
        `\n⏩ is running: ${this.workerTopHolder.isRunning()}` +
        `\n⏸️ is pause: ${await this.queueTopHolder.isPaused()}` +
        `\n⏯️ next_Job: ${(await this.workerTopHolder.getNextJob('debank-top-holder'))?.id}` +
        `\n 🔴 debank ranking:` +
        `\n+ ${rankingJobs.waiting} waiting` +
        `\n+ ${rankingJobs.active} active` +
        `\n+ ${rankingJobs.delayed} delayed` +
        `\n+ ${rankingJobs.completed} completed` +
        `\n- ${rankingJobs.failed} failed` +
        `\n⏩ is running: ${this.workerRanking.isRunning()}` +
        `\n⏸️ is pause: ${await this.queueRanking.isPaused()}` +
        `\n⏯️ next_Job: ${(await this.workerRanking.getNextJob('debank-ranking'))?.id}` +
        `\n 🔴 debank insert:` +
        `\n+ ${insertJobs.waiting} waiting` +
        `\n+ ${insertJobs.active} active` +
        `\n+ ${insertJobs.delayed} delayed` +
        `\n+ ${insertJobs.completed} completed` +
        `\n- ${insertJobs.failed} failed` +
        `\n⏩ is running: ${this.workerInsert.isRunning()}` +
        `\n⏸️ is pause: ${await this.queueInsert.isPaused()}` +
        `\n⏯️ next_Job: ${(await this.workerInsert.getNextJob('debank-insert'))?.id}` +
        `\n 🔴 debank common:` +
        `\n+ ${debankCommonJobs.waiting} waiting` +
        `\n+ ${debankCommonJobs.active} active` +
        `\n+ ${debankCommonJobs.delayed} delayed` +
        `\n+ ${debankCommonJobs.completed} completed` +
        `\n- ${debankCommonJobs.failed} failed` +
        `\n⏩ is running: ${this.workerCommon.isRunning()}` +
        `\n⏸️ is pause: ${await this.queueCommon.isPaused()}` +
        `\n⏯️ next_Job: ${(await this.workerCommon.getNextJob('debank-common'))?.id}` +
        `\ntotal not finished jobs: ${totalNotFinishedJobs}` +
        `\ntime: ${new Date().toISOString()}` +
        `\`\`\``;
      await discord.sendMsg({
        message: messageByRow,
        channelId: '1072390401392115804',
      });
    });
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
      case 'debank-common':
        return this.queueCommon;
      default:
        return this.queue;
    }
  }
  private initRepeatJobs() {
    //DB Job
    this.queue.add(
      DebankJobNames['debank:create:partitions'],
      {},
      {
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
    );

    this.queue.add(
      DebankJobNames['debank:clean:outdated-data'],
      {},
      {
        repeatJobKey: 'debank:clean:outdated-data',
        jobId: 'debank:clean:outdated-data',
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
    );

    this.queue.add(
      DebankJobNames['debank:add:fetch:protocols:pools'],
      {},
      {
        repeatJobKey: 'debank:add:fetch:protocols:pools',
        jobId: `debank:add:fetch:protocols:pools`,
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
    );

    // this.queue.add(
    //   DebankJobNames['debank:add:fetch:user-address:top-holders'],
    //   {},
    //   {
    //     repeatJobKey: 'debank:add:fetch:user-address:top-holders',
    //     jobId: `debank:add:fetch:user-address:top-holders`,
    //     removeOnComplete: {
    //       //remove after 1 hour
    //       age: 60 * 60 * 24,
    //     },
    //     removeOnFail: {
    //       //remove after 1 hour
    //       age: 60 * 60 * 24,
    //     },
    //     repeat: {
    //       //repeat every 3 hours
    //       every: 1000 * 60 * 60 * 24,
    //       // pattern: '* 0 0 * * *',
    //     },
    //     //delay for 5 minutes when the job is added for done other jobs
    //     delay: 1000 * 60 * 5,
    //     priority: 3,
    //     attempts: 5,
    //   },
    // );
    this.queue.add(
      DebankJobNames['debank:add:fetch:coins'],
      {},
      {
        repeatJobKey: 'debank:add:fetch:coins',
        repeat: {
          //repeat every 24 hours
          every: 1000 * 60 * 60 * 24,
          // pattern: '* 0 0 * * *',
        },
        priority: 1,
        attempts: 5,
      },
    );

    this.queue.add(
      DebankJobNames['debank:add:fetch:top-holders'],
      {},
      {
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
          every: 1000 * 60 * 60 * 1,
          // pattern: '* 0 0 * * *',
        },
        priority: 2,
        attempts: 5,
      },
    );
    this.queue.add(
      DebankJobNames['debank:add:social:users:rankings'],
      {},
      {
        repeatJobKey: 'debank:add:social:users:rankings',
        jobId: `debank:add:social:users:rankings`,
        removeOnComplete: {
          //remove job after 1 hours
          age: 60 * 60 * 24,
        },
        removeOnFail: {
          //remove job after 1 hours
          age: 60 * 60 * 24,
        },
        repeat: {
          //repeat every 3 hours
          every: 1000 * 60 * 60 * 24,
          // pattern: '* 0 0 * * *',
        },
        priority: 2,
        attempts: 5,
      },
    );
    this.queue.add(
      DebankJobNames['debank:add:fetch:whales:paging'],
      {},
      {
        repeatJobKey: 'debank:add:fetch:whales:paging',
        jobId: `debank:add:fetch:whales:paging`,
        removeOnComplete: {
          //remove job after 1 hours
          age: 60 * 60 * 24,
        },
        removeOnFail: {
          //remove job after 1 hours
          age: 60 * 60 * 24,
        },
        repeat: {
          //repeat every 24 hours
          every: 1000 * 60 * 60 * 24,
        },
        priority: 2,
        attempts: 5,
      },
    );
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
        config: {
          proxy: {
            host: WEBSHARE_PROXY_HTTP.host,
            port: WEBSHARE_PROXY_HTTP.port,
            auth: {
              username: WEBSHARE_PROXY_RANKING_WHALE_TOPHOLDERS_HTTP.auth.username,
              password: WEBSHARE_PROXY_RANKING_WHALE_TOPHOLDERS_HTTP.auth.password,
            },
            protocol: WEBSHARE_PROXY_HTTP.protocol,
          },
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
      const crawl_id = await getDebankSocialRankingCrawlId();
      const jobs: {
        name: DebankJobNames;
        data: any;
        opts: JobsOptions;
      }[] = [];
      for (let page_num = 1; page_num <= 1000; page_num++) {
        jobs.push({
          name: DebankJobNames['debank:fetch:social:rankings:page'],
          data: {
            page_num,
            crawl_id,
          },
          opts: {
            jobId: `debank:fetch:social:rankings:page:${page_num}:${crawl_id}`,
            removeOnComplete: {
              age: 60 * 60 * 3,
            },
            removeOnFail: {
              age: 60 * 60 * 3,
            },
            priority: 5,

            delay: 1000 * 30,
          },
        });
      }
      await this.queueRanking.addBulk(jobs);
      const discord = Container.get(DIDiscordClient);

      await discord.sendMsg({
        message:
          `\`\`\`diff` +
          `\n[DEBANK-addFetchSocialRankingJob]` +
          `\n+ totalJobs::${jobs.length}` +
          `\nstart on::${new Date().toISOString()}` +
          `\ncrawl_id::${crawl_id}` +
          `\`\`\`
        `,
        channelId: '1041620555188682793',
      });
    } catch (error) {
      this.logger.discord('error', '[addFetchSocialRankingJob:error]', JSON.stringify(error));
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
        config: {
          proxy: {
            host: WEBSHARE_PROXY_HTTP.host,
            port: WEBSHARE_PROXY_HTTP.port,
            auth: {
              username: WEBSHARE_PROXY_RANKING_WHALE_TOPHOLDERS_HTTP.auth.username,
              password: WEBSHARE_PROXY_RANKING_WHALE_TOPHOLDERS_HTTP.auth.password,
            },
            protocol: WEBSHARE_PROXY_HTTP.protocol,
          },
        },
      });
      if (status !== 200 || error_code) {
        throw new Error('fetchWhaleList:fetch:fail');
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
      await insertDebankWhaleList({ whales, crawl_id });
    } catch (error) {
      this.logger.discord('error', '[fetchWhalesPage:error]', JSON.stringify(error));
      throw error;
    }
  }

  async addFetchWhalesPagingJob() {
    try {
      const crawl_id = await getDebankWhalesCrawlId();

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
        opts: JobsOptions;
      }[] = listIndex.map((index: number) => ({
        name: DebankJobNames['debank:fetch:whales:page'],
        data: {
          start: index,
          crawl_id,
        },
        opts: {
          jobId: `debank:fetch:whales:page:${crawl_id}:${index}`,
          removeOnComplete: {
            // remove job after 1 hour
            age: 60 * 60 * 3,
          },
          removeOnFail: {
            age: 60 * 60 * 3,
          },

          delay: 1000 * 30,

          priority: 5,
          attempts: 10,
        },
      }));
      await this.queueWhale.addBulk(jobs);
      await insertDebankWhaleList({ whales, crawl_id });
      const discord = Container.get(DIDiscordClient);

      await discord.sendMsg({
        message:
          `\`\`\`diff` +
          `\n[DEBANK-addFetchWhalesPagingJob]` +
          `\n+ total_jobs:: ${jobs.length}` +
          `\nstart on::${new Date().toISOString()}` +
          `\ncrawl_id::${crawl_id}` +
          `\`\`\``,
        channelId: '1041620555188682793',
      });
    } catch (error) {
      this.logger.discord('error', '[addFetchWhalesPagingJob:error]', JSON.stringify(error));
      throw error;
    }
  }

  async addFetchTopHoldersByUsersAddressJob() {
    const { rows } = await queryDebankTopHoldersImportantToken();

    const crawl_id = await getDebankCrawlId();

    const NUM_ADDRESSES_PER_JOB = 5;
    const user_addresses_list = Array.from({ length: Math.ceil(rows.length / NUM_ADDRESSES_PER_JOB) }).map((_, i) => {
      return [
        ...rows
          .slice(i * NUM_ADDRESSES_PER_JOB, (i + 1) * NUM_ADDRESSES_PER_JOB)
          .map(({ user_address }: any) => user_address),
      ];
    });
    const jobs = user_addresses_list.map((user_addresses: any, index) => ({
      name: DebankJobNames['debank:crawl:portfolio:list'],
      data: {
        user_addresses,
        crawl_id,
      },
      opts: {
        jobId: `debank:crawl:portfolio:list:${crawl_id}:${index}`,
        removeOnComplete: {
          age: 60 * 60 * 6,
        },
        removeOnFail: {
          age: 60 * 60 * 6,
        },
        priority: 10,
        attempts: 10,
        // delay: 1000 * 5,
      },
    }));
    await this.queue.addBulk(jobs);
    const discord = Container.get(DIDiscordClient);
    await discord.sendMsg({
      message:
        `\`\`\`diff` +
        `\n[DEBANK-addFetchTopHoldersByUsersAddressJob]` +
        `\n+ total_job: ${jobs.length}` +
        `\ncrawl_id::${crawl_id}` +
        `\nstart on::${new Date().toISOString()}` +
        `\`\`\``,
      channelId: '1041620555188682793',
    });
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
          proxy: {
            host: WEBSHARE_PROXY_HTTP.host,
            port: WEBSHARE_PROXY_HTTP.port,
            auth: {
              username: WEBSHARE_PROXY_RANKING_WHALE_TOPHOLDERS_HTTP.auth.username,
              password: WEBSHARE_PROXY_RANKING_WHALE_TOPHOLDERS_HTTP.auth.password,
            },
            protocol: WEBSHARE_PROXY_HTTP.protocol,
          },
        },
      });
      if (status !== 200 || error_code) {
        throw new Error('fetchTopHolders:error');
      }
      const { holders } = data;
      await insertDebankTopHolders({
        holders,
        crawl_id,
        id,
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
          proxy: {
            host: WEBSHARE_PROXY_HTTP.host,
            port: WEBSHARE_PROXY_HTTP.port,
            auth: {
              username: WEBSHARE_PROXY_RANKING_WHALE_TOPHOLDERS_HTTP.auth.username,
              password: WEBSHARE_PROXY_RANKING_WHALE_TOPHOLDERS_HTTP.auth.password,
            },
            protocol: WEBSHARE_PROXY_HTTP.protocol,
          },
        },
      });
      if (status !== 200 || error_code) {
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
        this.queueTopHolder.add(
          DebankJobNames['debank:fetch:top-holders:page'],
          {
            id,
            start: index,
            limit: DebankAPI.Coin.top_holders.params.limit,
            crawl_id,
          },
          {
            jobId: `debank:fetch:top-holders:page:${crawl_id}:${id}:${index}`,
            removeOnComplete: true,
            removeOnFail: {
              age: 60 * 60 * 1,
            },
            priority: 7,
            attempts: 10,
          },
        );
      });
      await insertDebankTopHolders({
        holders,
        crawl_id,
        id,
      });
    } catch (error) {
      this.logger.error('error', '[fetchTopHolders:error]', JSON.stringify(error));
      throw error;
    }
  }
  async addFetchTopHoldersJob() {
    try {
      const crawl_id = await getDebankTopHoldersCrawlId();
      const allCoins = await queryDebankAllCoins();
      //164
      const jobs = allCoins.map(({ symbol, db_id }) => ({
        name: DebankJobNames['debank:crawl:top-holders'],
        data: {
          id: db_id,
          crawl_id,
        },
        opts: {
          jobId: `debank:crawl:top-holders:${crawl_id}:${symbol}`,
          removeOnComplete: {
            age: 60 * 60 * 3,
          },
          removeOnFail: {
            age: 60 * 60 * 3,
          },
          priority: 5,
          delay: 1000 * 30,
          attempts: 10,
        },
      }));
      await this.queueTopHolder.addBulk(jobs);
      const discord = Container.get(DIDiscordClient);

      await discord.sendMsg({
        message:
          `\`\`\`diff` +
          `\n[DEBANK-addFetchTopHoldersJob]` +
          `\n+ total: ${jobs.length}` +
          `\nstart on::${new Date().toISOString()}` +
          `\ncrawl_id: ${crawl_id}` +
          `\`\`\``,
        channelId: '1041620555188682793',
      });
    } catch (error) {
      this.logger.error('error', '[addFetchTopHoldersJob:error]', JSON.stringify(error));
      throw error;
    }
  }

  async addFetchCoinsJob() {
    try {
      const crawl_id = await getDebankCoinsCrawlId();
      const {
        data: { data, error_code },
        status,
      } = await DebankAPI.fetch({
        endpoint: DebankAPI.Coin.list.endpoint,
        config: {
          proxy: {
            host: WEBSHARE_PROXY_HTTP.host,
            port: WEBSHARE_PROXY_HTTP.port,
            auth: {
              username: WEBSHARE_PROXY_RANKING_WHALE_TOPHOLDERS_HTTP.auth.username,
              password: WEBSHARE_PROXY_RANKING_WHALE_TOPHOLDERS_HTTP.auth.password,
            },
            protocol: WEBSHARE_PROXY_HTTP.protocol,
          },
        },
      });
      if (status !== 200 || error_code) {
        throw new Error('addFetchCoinsJob:error');
      }
      const { coins } = data;
      await insertDebankCoins({
        coins,
        crawl_id,
      });
    } catch (error) {
      this.logger.error('error', '[addFetchCoinsJob:error]', JSON.stringify(error));
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

  async truncatePartitions({ table, days = 14, keepDays = 7 }: { table: string; days?: number; keepDays?: number }) {
    try {
      const keepDate = Array.from({ length: keepDays }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return formatDate(date, 'YYYYMMDD');
      });
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = formatDate(date, 'YYYYMMDD');
        //keep some days
        if (keepDate.includes(dateStr)) {
          continue;
        }
        //truncate by date
        //example: debank-portfolio-balances-20210701
        await truncateAndDropTable({
          table: `${table}-${dateStr}`,
        });
      }
    } catch (error) {
      this.logger.error('error', '[truncatePartitions:error]', JSON.stringify(error));
      throw error;
    }
  }

  async fetchUserProfile({ address }: { address: string }) {
    const {
      data: { data, error_code },
      status,
    } = await DebankAPI.fetch({
      endpoint: DebankAPI.User.addr.endpoint,
      params: {
        addr: address,
      },
    });
    if (status !== 200 || error_code || !data) {
      throw new Error('fetchUserProfile:error');
    }
    return { data };
  }

  async updateUserProfileJob({ address }: { address: string }) {
    try {
      const { data } = await this.fetchUserProfile({ address });
      await updateDebankUserProfile({ address, profile: data });
    } catch (error) {
      this.logger.error('error', '[updateUserProfileJob:error]', JSON.stringify(error));
      throw error;
    }
  }

  async crawlPortfolioByList({ user_addresses, crawl_id }: { user_addresses: string[]; crawl_id: string }) {
    const browser = await (process.env.MODE === 'production' ? connectChrome() : createPuppeteerBrowser());
    const context = await browser.defaultBrowserContext();
    const jobData = Object.fromEntries(user_addresses.map((k) => [k, {} as any]));
    const page = await context.newPage();
    await page.authenticate({
      username: WEBSHARE_PROXY_HTTP.auth.username,
      password: WEBSHARE_PROXY_HTTP.auth.password,
    });
    await page.goto(`https://debank.com/profile/${user_addresses[0]}`, {
      waitUntil: 'load',
    });
    try {
      await bluebird.map(
        user_addresses,
        async (user_address) => {
          try {
            const cache_balance_list = await pageDebankFetchProfileAPI({
              url: `https://api.debank.com/token/cache_balance_list?user_addr=${user_address}`,
              page,
              user_address,
            });
            await sleep(3 * 1000);
            const project_list = await pageDebankFetchProfileAPI({
              url: `https://api.debank.com/portfolio/project_list?user_addr=${user_address}`,
              page,
              user_address,
            });
            if (project_list.status() != 200 || cache_balance_list.status() != 200) {
              throw new Error('crawlPortfolio:response:not 200');
            }
            const { data: balance_list_data } = await cache_balance_list.json();
            jobData[user_address]['balance_list'] = balance_list_data;

            const { data: project_list_data } = await project_list.json();
            jobData[user_address]['project_list'] = project_list_data;
          } catch (error) {
            this.logger.discord('error', '[crawlPortfolio:page:error]', JSON.stringify(error));
            throw error;
          } finally {
          }
        },
        {
          concurrency: 5,
        },
      );

      if (
        Object.values(jobData).some((data) => {
          return !this.isValidPortfolioData(data);
        })
      ) {
        throw new Error('crawlPortfolio:mismatch-data');
      }
      const jobs = Object.entries(jobData).map(([user_address, data]) => {
        return {
          name: DebankJobNames['debank:insert:user-assets-portfolio'],
          data: {
            ...data,
            crawl_id,
            user_address,
          },
          opts: {
            jobId: `debank:insert:user-assets-portfolio:${user_address}:${crawl_id}`,
            removeOnComplete: {
              // remove job after 1 hour
              age: 60 * 30,
            },
            removeOnFail: {
              age: 60 * 60 * 1,
            },
            priority: 10,
            attempts: 10,
          },
        };
      });
      //TODO: bulk insert to job queue
      if (process.env.MODE == 'production') {
        this.queueInsert.addBulk(jobs);
      }
    } catch (error) {
      this.logger.error('error', '[crawlPortfolioByList:error]', JSON.stringify(error));
      throw error;
    } finally {
      await page.close();
      // await context.close();
      browser.disconnect();
    }
  }

  async crawlTopHolders({ id, crawl_id }: { id: string; crawl_id: number }) {
    const browser = process.env.MODE == 'production' ? await connectChrome() : await createPuppeteerBrowser();
    // const browser = await createPuppeteerBrowser();
    const context = await browser.createIncognitoBrowserContext();
    let jobData = [];
    const page = await context.newPage();
    try {
      //login proxy
      await page.authenticate({
        username: WEBSHARE_PROXY_HTTP.auth.username,
        password: WEBSHARE_PROXY_HTTP.auth.password,
      });
      //go to page and get total count
      const [_, data] = await Promise.all([
        page.goto(`https://debank.com/tokens/${id}/holders`, {
          waitUntil: 'load',
        }),
        page.waitForResponse((response) => {
          return response.url().includes(DebankAPI.Coin.top_holders.endpoint);
        }),
      ]);
      const dataJson = await data.json();
      const {
        data: { total_count },
      } = dataJson;
      //set localstorage
      await page.evaluate(
        ({ current_address, connected_dict, browser_uid }) => {
          // @ts-ignore
          window.localStorage.setItem('current_address', current_address);
          // @ts-ignore
          window.localStorage.setItem('connected_dict', connected_dict);
          // @ts-ignore
          window.localStorage.setItem('browser_uid', browser_uid);
        },
        {
          current_address,
          connected_dict,
          browser_uid,
        },
      );
      await page.reload();
      await sleep(15 * 1000);
      const listIndex = Array.from(Array(Math.ceil(total_count / DebankAPI.Coin.top_holders.params.limit))).reduce(
        (acc, _, index) => {
          acc.push(index * DebankAPI.Coin.top_holders.params.limit);
          return acc;
        },
        [],
      );
      const fetchTopHolders = async ({
        offset,
        retry = 3,
        timeout = 30 * 1000,
      }: {
        offset: number;
        retry?: number;
        timeout?: number;
      }) => {
        try {
          const url = new URL(DebankAPI.Coin.top_holders.endpoint);
          url.searchParams.append('id', id);
          url.searchParams.append('start', offset.toString());
          url.searchParams.append('limit', DebankAPI.Coin.top_holders.params.limit.toString());
          const [_, data] = await Promise.all([
            page.evaluate(
              (url, account) => {
                // @ts-ignore
                fetch(url, {
                  headers: {
                    account,
                  },
                  referrerPolicy: 'strict-origin-when-cross-origin',
                  body: null,
                  method: 'GET',
                  mode: 'cors',
                  credentials: 'include',
                }).then((res) => res.json());
              },
              url.toString(),
              account,
            ),
            page.waitForResponse(
              async (response) => {
                return response.url().includes(url.toString());
              },
              {
                timeout,
              },
            ),
          ]);
          //check if response is valid
          await data.json();
          await sleep(1000);
          return data;
        } catch (error) {
          if (retry > 0) {
            await fetchTopHolders({ offset, retry: retry - 1 });
          } else {
            throw error;
          }
        }
      };

      await bluebird.map(
        listIndex,
        async (offset: number) => {
          const response = await fetchTopHolders({
            offset,
          });
          const { data: dataJson } = await response.json();
          const { holders } = dataJson;
          jobData = uniqBy([...jobData, ...holders], 'id');
        },
        {
          concurrency: 3,
        },
      );
      if (!this.isValidTopHoldersData({ data: jobData, total_count })) {
        throw new Error('crawlTopHolders:invalid-data');
      }
      if (process.env.MODE == 'production') {
        await insertDebankTopHolders({
          holders: jobData,
          crawl_id,
          id,
        });
      }
    } catch (error) {
      this.logger.error('error', '[crawlTopHoldersByList:error]', JSON.stringify(error));
      throw error;
    } finally {
      //cleanup
      await page.close();
      await context.close();
      // await browser.close();
      browser.disconnect();
    }
  }

  //! NOT STABLE YET -> NEED TO REFACTOR
  async crawlWhales({ crawl_id }: { crawl_id: number }) {
    // const browser = await connectChrome();
    const browser = await createPuppeteerBrowser();
    const context = await browser.createIncognitoBrowserContext();
    let jobData = [];
    const page = await context.newPage();
    try {
      //login proxy
      await page.authenticate({
        username: WEBSHARE_PROXY_HTTP.auth.username,
        password: WEBSHARE_PROXY_HTTP.auth.password,
      });
      //go to page and get total count
      const [_, data] = await Promise.all([
        page.goto(`https://debank.com/whales`, {
          waitUntil: 'load',
        }),
        page.waitForResponse((response) => {
          return response.url().includes(DebankAPI.Whale.list.endpoint);
        }),
      ]);
      const dataJson = await data.json();
      const {
        data: { total_count },
      } = dataJson;
      const listIndex = Array.from(Array(Math.ceil(total_count / DebankAPI.Whale.list.params.limit))).reduce(
        (acc, _, index) => {
          acc.push(index * DebankAPI.Whale.list.params.limit);
          return acc;
        },
        [],
      );

      const fetchWhalesPage = async ({
        offset,
        retry = 3,
        timeout = 30 * 1000,
      }: {
        offset: number;
        retry?: number;
        timeout?: number;
      }) => {
        try {
          const url = new URL(DebankAPI.Whale.list.endpoint);
          url.searchParams.append('start', offset.toString());
          url.searchParams.append('limit', DebankAPI.Whale.list.params.limit.toString());
          url.searchParams.append('order_by', '-usd_value');
          const [_, data] = await Promise.all([
            page.evaluate(
              (url, account) => {
                // @ts-ignore-start
                fetch(url, {
                  headers: {
                    account,
                  },
                  referrerPolicy: 'strict-origin-when-cross-origin',
                  body: null,
                  method: 'GET',
                  mode: 'cors',
                  credentials: 'include',
                }).then((res) => res.json());
                // @ts-ignore-end
              },
              url.toString(),
              account,
            ),
            page.waitForResponse(
              async (response) => {
                return response.url().includes(url.toString());
              },
              {
                timeout,
              },
            ),
          ]);
          //check if response is valid
          await data.json();
          await sleep(1000);
          return data;
        } catch (error) {
          if (retry > 0) {
            await fetchWhalesPage({ offset, retry: retry - 1 });
          } else {
            throw error;
          }
        }
      };

      await bluebird.map(
        listIndex,
        async (offset: number) => {
          const response = await fetchWhalesPage({
            offset,
          });
          const { data: dataJson } = await response.json();
          const { whales } = dataJson;
          jobData = uniqBy([...jobData, ...whales], 'id');
          // console.log('jobData', jobData.length);
        },
        {
          concurrency: 3,
        },
      );
      // console.log('jobData', uniq(jobData.map((item) => item.id)).length);
      // if (!this.isValidTopHoldersData({ data: jobData, total_count })) {
      //   throw new Error('crawlTopHolders:invalid-data');
      // }
      if (process.env.MODE == 'production') {
        // await this.insertTopHolders({
        //   holders: jobData,
        //   crawl_id,
        //   symbol: id,
        // });
      }
    } catch (error) {
      this.logger.error('error', '[crawlTopHoldersByList:error]', JSON.stringify(error));
      throw error;
    } finally {
      //cleanup
      await page.close();
      await context.close();
      // await browser.close();
      browser.disconnect();
    }
  }

  isValidPortfolioData(data: any) {
    return data && data.balance_list && data.project_list;
  }

  isValidTopHoldersData({ data, total_count }: { data: any[]; total_count: number }) {
    return data && uniqBy(data, 'id').length == total_count;
  }

  async addFetchProtocolPoolsById({ id: protocol_id }) {
    try {
      const {
        data: { data, error_code },
        status,
      } = await DebankAPI.fetch({
        endpoint: DebankAPI.Protocols.pool.endpoint,
        params: {
          id: protocol_id,
          start: 0,
          limit: 20,
        },
        config: {
          proxy: {
            host: WEBSHARE_PROXY_HTTP.host,
            port: WEBSHARE_PROXY_HTTP.port,
            auth: {
              username: WEBSHARE_PROXY_RANKING_WHALE_TOPHOLDERS_HTTP.auth.username,
              password: WEBSHARE_PROXY_RANKING_WHALE_TOPHOLDERS_HTTP.auth.password,
            },
            protocol: WEBSHARE_PROXY_HTTP.protocol,
          },
        },
      });
      if (status !== 200 || error_code) {
        throw new Error('fetchProtocolPoolsPage:error');
      }
      const { total_count } = data;
      const jobs = Array.from(
        { length: Math.ceil(total_count / DebankAPI.Protocols.pool.params.limit) },
        (_, index) => ({
          name: DebankJobNames['debank:fetch:protocols:pools:page'],
          data: {
            protocol_id,
            start: index * DebankAPI.Protocols.pool.params.limit,
            limit: DebankAPI.Protocols.pool.params.limit,
          },
          opts: {
            jobId: `debank:fetch:protocols:pools:page:${protocol_id}:${index}`,
            removeOnComplete: {
              age: 60 * 60 * 3,
            },
            removeOnFail: {
              age: 60 * 60 * 3,
            },
            priority: 5,

            delay: 1000 * 30,
          },
        }),
      );
      jobs.length && (await this.queueCommon.addBulk(jobs));
    } catch (error) {
      this.logger.error('error', '[addFetchProtocolPools:error]', JSON.stringify(error));
      throw error;
    }
  }

  async fetchProtocolPoolsPage({
    protocol_id,
    start = DebankAPI.Protocols.pool.params.start,
    limit = DebankAPI.Protocols.pool.params.limit,
  }: {
    protocol_id: string;
    start?: number;
    limit?: number;
  }) {
    try {
      const {
        data: { data, error_code },
        status,
      } = await DebankAPI.fetch({
        endpoint: DebankAPI.Protocols.pool.endpoint,
        params: {
          id: protocol_id,
          start,
          limit,
        },
        config: {
          proxy: {
            host: WEBSHARE_PROXY_HTTP.host,
            port: WEBSHARE_PROXY_HTTP.port,
            auth: {
              username: WEBSHARE_PROXY_RANKING_WHALE_TOPHOLDERS_HTTP.auth.username,
              password: WEBSHARE_PROXY_RANKING_WHALE_TOPHOLDERS_HTTP.auth.password,
            },
            protocol: WEBSHARE_PROXY_HTTP.protocol,
          },
        },
      });
      if (status !== 200 || error_code) {
        throw new Error('fetchProtocolPoolsPage:error');
      }
      const { pools } = data;
      pools.length &&
        (await insertDebankPools({
          pools,
        }));
      return {
        pools,
      };
    } catch (error) {
      this.logger.error('error', '[fetchProtocolPoolsPage:error]', JSON.stringify(error));
      throw error;
    }
  }

  async addFetchProtocolPoolsJob() {
    try {
      const { rows } = await queryDebankProtocols();
      const jobs = rows.map(({ db_id: id }) => ({
        name: DebankJobNames['debank:add:fetch:protocols:pools:id'],
        data: {
          id,
        },
        opts: {
          jobId: `debank:add:fetch:protocols:pools:id:${id}`,
          removeOnComplete: {
            age: 60 * 60 * 3,
          },
          removeOnFail: {
            age: 60 * 60 * 3,
          },
          priority: 5,
          delay: 1000 * 30,
        },
      }));
      jobs.length && (await this.queueCommon.addBulk(jobs));
      const discord = Container.get(DIDiscordClient);

      await discord.sendMsg({
        message:
          `\`\`\`diff` +
          `\n[DEBANK-addFetchProtocolPoolsJob]` +
          `\n+ totalJobs::${jobs.length}` +
          `\nstart on::${new Date().toISOString()}` +
          `\`\`\`
        `,
        channelId: '1041620555188682793',
      });
    } catch (error) {
      this.logger.error('error', '[addFetchProtocolPools:error]', JSON.stringify(error));
      throw error;
    }
  }

  async crawlUsersProject({ user_addresses, crawl_id }: { user_addresses: string[]; crawl_id: string }) {
    const browser = await (process.env.MODE === 'production' ? connectChrome() : createPuppeteerBrowser());
    const context = browser.defaultBrowserContext();
    const jobData = Object.fromEntries(user_addresses.map((k) => [k, {} as any]));
    const page = await context.newPage();
    await page.authenticate({
      username: WEBSHARE_PROXY_HTTP.auth.username,
      password: WEBSHARE_PROXY_HTTP.auth.password,
    });
    await page.goto(`https://debank.com/profile/${user_addresses[0]}`, {
      waitUntil: 'load',
    });
    try {
      await bluebird.map(
        user_addresses,
        async (user_address) => {
          try {
            const project_list = await pageDebankFetchProfileAPI({
              url: `https://api.debank.com/portfolio/project_list?user_addr=${user_address}`,
              page,
              user_address,
            });
            if (project_list.status() != 200) {
              throw new Error('crawlUsersProject:response:not 200');
            }
            const { data: project_list_data } = await project_list.json();
            jobData[user_address]['project_list'] = project_list_data;
          } catch (error) {
            this.logger.discord('error', '[crawlUsersProject:page:error]', JSON.stringify(error));
            throw error;
          }
        },
        {
          concurrency: 5,
        },
      );

      if (
        Object.values(jobData).some((data) => {
          return !(data && data.project_list);
        })
      ) {
        throw new Error('crawlUsersProject:mismatch-data');
      }

      //TODO: bulk insert to job queue
      if (process.env.MODE == 'production') {
        const jobs = Object.entries(jobData).map(([user_address, data]) => {
          return {
            name: DebankJobNames['debank:insert:user-assets-portfolio'],
            data: {
              ...data,
              crawl_id,
              user_address,
            },
            opts: {
              jobId: `debank:insert:user-assets-portfolio:${user_address}:${crawl_id}`,
              removeOnComplete: {
                // remove job after 1 hour
                age: 60 * 30,
              },
              removeOnFail: {
                age: 60 * 60 * 1,
              },
              priority: 10,
              attempts: 10,
            },
          };
        });
        this.queueInsert.addBulk(jobs);
        const mgData = Object.entries(jobData)
          .map(([user_address, { project_list: projects }]) => ({
            address: user_address,
            projects,
            portfolio_item_list: projects
              .map(({ portfolio_item_list = [] }) => {
                return portfolio_item_list.map(({ stats, ...rest }) => ({
                  ...rest,
                  stats,
                  usd_value: stats.asset_usd_value,
                  net_value: stats.net_usd_value,
                  debt_value: stats.debt_usd_value,
                }));
              })
              .flat(),
            crawl_id,
            crawl_time: new Date(),
          }))
          .map(({ portfolio_item_list, ...rest }) => ({
            ...rest,
            portfolio_item_list,
            total_usd_value: portfolio_item_list.reduce((acc, { usd_value }) => acc + usd_value, 0),
            total_net_usd_value: portfolio_item_list.reduce((acc, { net_value }) => acc + net_value, 0),
            total_debt_usd_value: portfolio_item_list.reduce((acc, { debt_value }) => acc + debt_value, 0),
          }));
        await bulkWriteUsersProject(mgData);
      }
    } catch (error) {
      this.logger.error('error', '[crawlUsersProject:error]', JSON.stringify(error));
      throw error;
    } finally {
      await page.close();
      // await context.close();
      browser.disconnect();
    }
  }
}
