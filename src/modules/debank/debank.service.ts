import Container from 'typedi';
import Logger from '@/core/logger';
import { Job, JobsOptions, MetricsTime, Queue, QueueEvents, Worker } from 'bullmq';
import { env } from 'process';
import { DIRedisConnection } from '@/loaders/redisClientLoader';

import { DebankJobData, DebankJobNames } from './debank.job';
import { DebankAPI } from '@/common/api';
import { pgClientToken, pgPoolToken } from '@/loaders/pgLoader';
import { sleep } from '@/utils/common';

const pgPool = Container.get(pgPoolToken);
const pgClient = Container.get(pgClientToken);
export class DebankService {
  private logger = new Logger('Debank');

  private readonly redisConnection = Container.get(DIRedisConnection);

  private worker: Worker;

  private queue: Queue;

  // private queueScheduler: QueueScheduler;

  private readonly jobs: {
    [key in DebankJobNames | 'default']?: (payload?: any) => Promise<void>;
  } = {
    'debank:fetch:project:list': this.fetchProjectList,
    'debank:add:project:users': this.addFetchProjectUsersJobs,
    'debank:fetch:project:users': this.fetchProjectUsers,
    'debank:fetch:social:user': this.fetchSocialRankingByUserAddress,
    'debank:add:social:users': this.addFetchSocialRankingByUsersAddressJob,
    default: () => {
      throw new Error('Invalid job name');
    },
  };

  constructor() {
    //TODO: remove this
    // this.fetchProjectList();
    // this.fetchProjectUsers({
    //   projectId: '0x',
    // });
    // this.queryUserAddressByProjectId({
    //   projectId: 'matic_aave',
    // }).then(async (res) => {
    //   for (const { user_address } of res) {
    //     await this.fetchUserBalanceList({
    //       user_address,
    //     });
    //   }
    // });

    //?fetch socials ranking 20page
    //TODO: remove this
    // for (let i = 1; i <= 20; i++) {
    //   this.fetchSocialRanking({
    //     page_num: i,
    //   });
    // }
    // this.querySocialRanking({
    //   select: 'user_address',
    // }).then(async ({ rows }: any) => {
    //   for (const { user_address } of rows) {
    //     console.log(user_address);
    //     //from index 42
    //     await this.fetchSocialRankingByUserAddress({
    //       user_address,
    //     });
    //   }
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
      concurrency: 20,
      limiter: {
        max: 2,
        duration: 60 * 1000,
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
        backoff: { type: 'exponential', delay: 5 * 60 * 1000 },
        removeOnComplete: {
          age: 1000 * 60 * 60 * 24 * 7,
        },
        removeOnFail: {
          age: 1000 * 60 * 60 * 24 * 7,
        },
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
    // this.addJob({
    //   name: 'debank:fetch:project:list',
    //   options: {
    //     repeatJobKey: 'debank:fetch:project:list',
    //     repeat: {
    //       // every: 1000 * 60 * 60,
    //       pattern: '* 0 0 * * *',
    //     },
    //     priority: 1,
    //   },
    // });
    // this.addJob({
    //   name: 'debank:add:project:users',
    //   options: {
    //     repeatJobKey: 'debank:add:project:users',
    //     repeat: {
    //       // every: 1000 * 60 * 30,
    //       pattern: '* 0 0 * * *',
    //     },
    //     priority: 1,
    //   },
    // });
    this.addJob({
      name: 'debank:add:social:users',
      options: {
        repeatJobKey: 'debank:add:social:users',
        repeat: {
          //repeat every 4 hours
          every: 1000 * 60 * 60 * 4,
          // pattern: '* 0 0 * * *',
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
      // .then(({ id, name }) => this.logger.debug(`success`, `[addJob:success]`, { id, name, payload }))
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
            jobId: `debank:fetch:project:users:${id}:${Date.now()}`,
            removeOnComplete: {
              age: 1000 * 60 * 60 * 24 * 7,
            },
            removeOnFail: {
              age: 1000 * 60 * 60 * 24 * 7,
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
  }) {
    await pgPool
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
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [user_address, symbol, optimized_symbol, token_name, token_id, amount, price, protocol_id, chain, updated_at],
      )
      .catch((err) => this.logger.discord('error', '[debank:insertUserBalance]', JSON.stringify(err)));
  }
  async queryUserAddressByProjectId({ projectId }: { projectId: string }) {
    try {
      if (!projectId) {
        throw new Error('queryUserAddressByProjectId: projectId is required');
      }
      const { rows } = await pgPool.query(
        `SELECT user_address FROM "debank-project-users" WHERE project_id = $1 GROUP BY user_address`,
        [projectId],
      );
      return { rows };
    } catch (error) {
      this.logger.discord('error', '[queryUserAddressByProjectId:error]', JSON.stringify(error));
      throw error;
    }
  }
  async fetchSocialRanking({ page_num = 1, page_count = 50 }: { page_num: number; page_count?: number }) {
    try {
      const { data, status } = await DebankAPI.fetch({
        endpoint: DebankAPI.Social.socialRanking.endpoint,
        params: {
          page_num,
          page_count,
        },
      });
      if (status !== 200) {
        throw new Error('fetchSocialRanking: Error fetching social ranking');
      }
      const {
        data: { social_ranking_list },
      } = data;
      for (const { id: user_address, rank, base_score, score_dict, value_dict, total_score } of social_ranking_list) {
        await this.insertSocialRanking({ user_address, rank, base_score, total_score, score_dict, value_dict });
      }
    } catch (error) {
      this.logger.discord('error', '[fetchSocialRanking:error]', JSON.stringify(error));
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
    await pgPool.query(
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
  async querySocialRanking({ select = '*' }: { select: string } = { select: '*' }) {
    const { rows } = await pgPool.query(`SELECT ${select} FROM "debank-social-ranking" ORDER BY rank ASC`);
    return { rows };
  }
  async fetchSocialRankingByUserAddress({ user_address }: { user_address: string }) {
    try {
      if (!user_address) {
        throw new Error('fetchSocialRankingByUserAddress: user_address is required');
      }
      const { data: fetchProjectListData } = await DebankAPI.fetch({
        endpoint: DebankAPI.Portfolio.projectList.endpoint,
        params: {
          user_addr: user_address,
        },
      });
      await sleep(20000);
      const { data: fetchAssetClassifyData } = await DebankAPI.fetch({
        endpoint: DebankAPI.Asset.classify.endpoint,
        params: {
          user_addr: user_address,
        },
      });
      await sleep(20000);
      const { data: fetchTokenBalanceListData } = await DebankAPI.fetch({
        endpoint: DebankAPI.Token.cacheBalanceList.endpoint,
        params: {
          user_addr: user_address,
        },
      });
      await sleep(20000);

      const error_code =
        fetchProjectListData.error_code || fetchAssetClassifyData.error_code || fetchTokenBalanceListData.error_code;
      if (error_code) {
        //TODO: handle error change this to discord
        this.logger.debug('error', '[fetchSocialRankingByUserAddress:error]', JSON.stringify(error_code), {
          msg1: fetchProjectListData.error_msg,
          msg2: fetchAssetClassifyData.error_msg,
          msg3: fetchTokenBalanceListData.error_msg,
        });
        throw new Error('fetchSocialRankingByUserAddress: Error fetching social ranking');
      }
      const {
        data: { coin_list, token_list },
      } = fetchAssetClassifyData;
      const { data: balance_list } = fetchTokenBalanceListData;
      const { data: project_list } = fetchProjectListData;
      await this.insertUserAssetPortfolio({ user_address, balance_list, coin_list, token_list, project_list });
    } catch (error) {
      this.logger.discord('error', '[fetchSocialRankingByUserAddress:error]', JSON.stringify(error));
      throw error;
    }
  }
  async insertUserAssetPortfolio({
    user_address,
    token_list = [],
    coin_list = [],
    balance_list = [],
    project_list = [],
  }: {
    user_address: string;
    token_list: any;
    coin_list: any;
    balance_list: any;
    project_list: any;
  }) {
    const now = new Date();
    await pgClient.query(
      `
      INSERT INTO "debank-user-address-list" (
        user_address,
        updated_at
      ) VALUES ($1, $2) ON CONFLICT (user_address) DO UPDATE SET updated_at = $2
    `,
      [user_address, now],
    );
    await Promise.all(
      token_list.map(async (token: any) => {
        await pgClient.query(
          `
        INSERT INTO "debank-user-asset-portfolio-tokens"(
          user_address,
          details,
          updated_at
        )
        VALUES ($1, $2, $3)
        `,
          [user_address, JSON.stringify(token), now],
        );
      }),
    );
    await Promise.all(
      coin_list.map(async (coin: any) => {
        await pgClient.query(
          `
        INSERT INTO "debank-user-asset-portfolio-coins"(
          user_address,
          details,
          updated_at
        )
        VALUES ($1, $2, $3)
        `,
          [user_address, JSON.stringify(coin), now],
        );
      }),
    );
    await Promise.all(
      balance_list.map(async (balance: any) => {
        await pgClient.query(
          `
        INSERT INTO "debank-user-asset-portfolio-balances"(
          user_address,
          details,
          updated_at
        )
        VALUES ($1, $2, $3)
        `,
          [user_address, JSON.stringify(balance), now],
        );
      }),
    );
    await Promise.all(
      project_list.map(async (project: any) => {
        await pgClient.query(
          `
        INSERT INTO "debank-user-asset-portfolio-projects"(
          user_address,
          details,
          updated_at
        )
        VALUES ($1, $2, $3)
        `,
          [user_address, JSON.stringify(project), now],
        );
      }),
    );
  }
  async addFetchSocialRankingByUsersAddressJob() {
    const { rows } = await this.querySocialRanking({
      select: 'user_address',
    });
    for (const { user_address } of rows) {
      this.addJob({
        name: 'debank:fetch:social:user',
        payload: {
          user_address,
        },
        options: {
          jobId: `debank:fetch:social:user:${user_address}:${Date.now()}`,
          removeOnComplete: {
            age: 1000 * 60 * 60 * 24 * 7,
          },
          removeOnFail: {
            age: 1000 * 60 * 60 * 24 * 7,
          },
          priority: 10,
          delay: 1000 * 60,
        },
      });
    }
  }
}
