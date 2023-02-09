import Container from 'typedi';
import Logger from '@/core/logger';
import { Job, JobsOptions, MetricsTime, Queue, QueueEvents, Worker } from 'bullmq';
import { env } from 'process';
import { DIRedisConnection } from '@/loaders/redis.loader';

import { DebankJobData, DebankJobNames } from './debank.job';
import { DebankAPI } from '@/common/api';
import { pgClientToken, pgPoolToken } from '@/loaders/pg.loader';

import STABLE_COINS from '../../data/defillama/stablecoins.json';
import { formatDate } from '@/utils/date';
import lodash from 'lodash';
import { bulkInsert } from '@/utils/pg';
const pgPool = Container.get(pgPoolToken);
const pgClient = Container.get(pgClientToken);

const account =
  '{"random_at":1675919820,"random_id":"7c7daa4df5744190a78835c2eb44930e","session_id":"8145eab5f7cc45399adb380e564c7b1d","user_addr":"0x2f5076044d24dd686d0d9967864cd97c0ee1ea8d","wallet_type":"metamask","is_verified":true}';
export class DebankService {
  private logger = new Logger('Debank');

  private readonly redisConnection = Container.get(DIRedisConnection);

  private worker: Worker;

  private workerInsert: Worker;

  private queue: Queue;

  private queueInsert: Queue;

  private readonly jobs: {
    [key in DebankJobNames | 'default']?: (payload?: any) => any;
  } = {
    'debank:fetch:project:list': this.queryProjectList,
    'debank:add:project:users': this.addFetchProjectUsersJobs,
    'debank:fetch:project:users': this.fetchProjectUsers,
    'debank:fetch:social:user': this.fetchSocialRankingByUserAddress,
    'debank:add:social:users': this.addFetchSocialRankingByUsersAddressJob,
    'debank:fetch:social:rankings': this.fetchSocialRankings,
    'debank:add:social:users:rankings': this.addFetchSocialRankingJob,
    'debank:fetch:user:project-list': this.fetchUserProjectList,
    'debank:fetch:user:assets-portfolios': this.fetchUserAssetClassify,
    'debank:fetch:user:token-balances': this.fetchUserTokenBalanceList,
    'debank:fetch:whales:paging': this.fetchWhalesPaging,
    'debank:add:fetch:whales:paging': this.addFetchWhalesPagingJob,
    'debank:insert:whale': this.insertWhale,
    'debank:insert:user-address': this.insertUserAddress,
    'debank:insert:user-assets-portfolio': this.insertUserAssetPortfolio,
    'debank:insert:coin': this.insertCoin,
    'debank:add:fetch:coins': this.addFetchCoinsJob,
    'debank:fetch:top-holders': this.fetchTopHolders,
    'debank:fetch:top-holders:page': this.fetchTopHoldersPage,
    'debank:insert:top-holder': this.insertTopHolder,
    'debank:add:fetch:top-holders': this.addFetchTopHoldersJob,
    'debank:add:fetch:user-address:top-holders': this.addFetchTopHoldersByUsersAddressJob,
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
    this.worker = new Worker('debank', this.workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 60 * 2,
      concurrency: 350,
      limiter: {
        max: 35,
        duration: 1000,
      },
      stalledInterval: 1000 * 60,
      maxStalledCount: 5,
      metrics: {
        maxDataPoints: MetricsTime.ONE_WEEK,
      },
    });

    this.workerInsert = new Worker('debank-insert', this.workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 60 * 2,
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
    });
    this.logger.debug('info', '[initWorker:debank]', 'Worker initialized');
    this.initWorkerListeners(this.worker);
    this.initWorkerListeners(this.workerInsert);
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
          age: 1000 * 60 * 60 * 24 * 7,
        },
        removeOnFail: {
          age: 1000 * 60 * 60 * 24 * 7,
        },
      },
    });

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

    this.queueInsert = new Queue('debank-insert', {
      connection: this.redisConnection,
      defaultJobOptions: {
        // The total number of attempts to try the job until it completes
        attempts: 5,
        // Backoff setting for automatic retries if the job fails
        backoff: { type: 'exponential', delay: 0.5 * 60 * 1000 },
        removeOnComplete: {
          age: 1000 * 60 * 60 * 24 * 7,
        },
        removeOnFail: {
          age: 1000 * 60 * 60 * 24 * 7,
        },
      },
    });
    const queueInsertEvents = new QueueEvents('debank-insert', {
      connection: this.redisConnection,
    });
    queueInsertEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      this.logger.discord('error', 'debank:Job failed', jobId, failedReason);
    });
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
    // this.addJob({
    //   name: 'debank:add:social:users',
    //   options: {
    //     repeatJobKey: 'debank:add:social:users',
    //     repeat: {
    //       //repeat every 2 hours
    //       every: 1000 * 60 * 60 * 3,
    //       // pattern: '* 0 0 * * *',
    //     },
    //     priority: 1,
    //     attempts: 5,
    //   },
    // });
    this.addJob({
      name: 'debank:add:fetch:user-address:top-holders',
      options: {
        repeatJobKey: 'debank:add:fetch:user-address:top-holders',
        repeat: {
          //repeat every 3 hours
          every: 1000 * 60 * 60 * 3,
          // pattern: '* 0 0 * * *',
        },
        priority: 1,
        attempts: 5,
      },
    });
    // this.addJob({
    //   name: 'debank:add:fetch:coins',
    //   options: {
    //     repeatJobKey: 'debank:add:fetch:coins',
    //     repeat: {
    //       //repeat every 24 hours
    //       every: 1000 * 60 * 60 * 24,
    //       // pattern: '* 0 0 * * *',
    //     },
    //     priority: 1,
    //     attempts: 5,
    //   },
    // });

    this.addJob({
      name: 'debank:add:fetch:top-holders',
      options: {
        repeatJobKey: 'debank:add:fetch:top-holders',
        repeat: {
          //repeat every 60 minutes
          every: 1000 * 60 * 60,
          // pattern: '* 0 0 * * *',
        },
        priority: 1,
        attempts: 5,
      },
    });
    // this.addJob({
    //   name: 'debank:add:social:users:rankings',
    //   options: {
    //     repeatJobKey: 'debank:add:social:users:rankings',
    //     repeat: {
    //       //repeat every 30 minutes
    //       every: 1000 * 60 * 30,
    //       // pattern: '* 0 0 * * *',
    //     },
    //     priority: 1,
    //     attempts: 5,
    //   },
    // });
    // this.addJob({
    //   name: 'debank:add:fetch:whales:paging',
    //   options: {
    //     repeatJobKey: 'debank:add:fetch:whales:paging',
    //     repeat: {
    //       //repeat every 30 minutes
    //       every: 1000 * 60 * 30,
    //     },
    //     priority: 1,
    //     attempts: 5,
    //   },
    // });
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
  addInsertJob({ name, payload = {}, options }: { name: DebankJobNames; payload?: any; options?: JobsOptions }) {
    this.queueInsert
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
        // .catch((err) => this.logger.discord('error', '[queryProjectList:insert]', JSON.stringify(err)));
      }
    } catch (error) {
      this.logger.discord('error', '[queryProjectList:error]', JSON.stringify(error));
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
  async fetchSocialRankings({ page_num = 1, page_count = 50 }: { page_num: number; page_count?: number }) {
    try {
      const { data, status } = await DebankAPI.fetch({
        endpoint: DebankAPI.Social.socialRanking.endpoint,
        params: {
          page_num,
          page_count,
        },
      });
      if (status !== 200) {
        throw new Error('fetchSocialRankings: Error fetching social ranking');
      }
      const {
        data: { social_ranking_list },
      } = data;
      for (const { id: user_address, rank, base_score, score_dict, value_dict, total_score } of social_ranking_list) {
        await this.insertSocialRanking({ user_address, rank, base_score, total_score, score_dict, value_dict });
      }
    } catch (error) {
      this.logger.discord('error', '[fetchSocialRankings:error]', JSON.stringify(error));
      throw error;
    }
  }
  async addFetchSocialRankingJob() {
    try {
      for (let page_num = 1; page_num <= 1000; page_num++) {
        this.addJob({
          name: 'debank:fetch:social:rankings',
          payload: {
            page_num,
          },
          options: {
            jobId: `debank:fetch:social:rankings:${page_num}:${Date.now()}`,
            removeOnComplete: true,
            removeOnFail: {
              age: 1000 * 60 * 60 * 24 * 7,
            },
            priority: 5,
            // delay: 1000 * 30,
          },
        });
      }
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
    const { rows } = await pgPool.query(
      `SELECT ${select} FROM "debank-social-ranking" ORDER BY ${orderBy} ${order} LIMIT ${limit}`,
    );
    return { rows };
  }
  async queryAddressList({
    select = '*',
    limit = 10000,
    orderBy = 'rank',
    order = 'ASC',
  }: {
    select: string;
    limit: number;
    orderBy: string;
    order: 'DESC' | 'ASC';
  }) {
    const { rows } = await pgPool.query(
      `SELECT ${select} FROM "debank-user-address-list" ORDER BY ${orderBy} ${order}  ${limit ? 'LIMIT ' + limit : ''}`,
    );
    return {
      rows,
    };
  }
  async fetchSocialRankingByUserAddress({ user_address, crawl_id }: { user_address: string; crawl_id: string }) {
    try {
      if (!user_address) {
        throw new Error('fetchSocialRankingByUserAddress: user_address is required');
      }
      const { balance_list } = await this.fetchUserTokenBalanceList({
        user_address,
      });
      // const { project_list } = await this.fetchUserProjectList({
      //   user_address,
      // });
      // const { coin_list, token_list } = await this.fetchUserAssetClassify({
      //   user_address,
      // });
      await this.insertUserAssetPortfolio({
        user_address,
        balance_list,
        project_list: [],
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
        //TODO: handle error change this to discord
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
        //TODO: handle error change this to discord
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
        this.logger.discord(
          'error',
          '[fetchWhaleList:error]',
          JSON.stringify(data),
          JSON.stringify({ status, error_code }),
        );
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
        details: JSON.stringify(whale),
        crawl_id,
        crawl_time: new Date(),
      }));
      await bulkInsert({
        data,
        table: 'debank-whales',
      });
    } catch (error) {
      this.logger.discord('error', '[insertWhaleList:error]', JSON.stringify(error));
      throw error;
    }
  }

  async insertWhale({ whale, crawl_id, updated_at }: { whale: any; crawl_id: number; updated_at?: Date }) {
    await pgClient.query(
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

  async fetchWhalesPaging({ start, crawl_id }: { start: number; crawl_id: number }) {
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
      this.logger.discord('error', '[addFetchWhaleListJob:error]', JSON.stringify(error));
      throw error;
    }
  }
  insertUserAddressList({
    whales = [],
    holders = [],
    debank_ranking_time,
    debank_whales_time,
    debank_top_holders_time,
    last_crawl_id,
  }: {
    whales?: any;
    holders?: any;
    debank_whales_time?: Date;
    debank_top_holders_time?: Date;
    debank_ranking_time?: Date;
    last_crawl_id?: number;
  }) {
    try {
      whales.map(({ id }: { id: string }) => {
        this.addInsertJob({
          name: 'debank:insert:user-address',
          payload: {
            user_address: id,
            updated_at: new Date(),
            debank_whales_time,
            debank_top_holders_time,
            debank_ranking_time,
          },
          options: {
            removeOnComplete: true,
            removeOnFail: {
              age: 1000 * 60 * 60 * 24,
            },
            priority: 5,
            attempts: 10,
          },
        });
      });
      holders.map(({ id }: { id: string }) => {
        this.addInsertJob({
          name: 'debank:insert:user-address',
          payload: {
            user_address: id,
            updated_at: new Date(),
            debank_whales_time,
            debank_top_holders_time,
            debank_ranking_time,
          },
          options: {
            removeOnComplete: true,
            removeOnFail: {
              age: 1000 * 60 * 60 * 24,
            },
            priority: 5,
            attempts: 10,
          },
        });
      });
    } catch (error) {
      this.logger.discord('error', '[fetchWhalesPaging:error]', JSON.stringify(error));
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
      listIndex.map((index: number) => {
        if (index === 0) return;
        this.addJob({
          name: 'debank:fetch:whales:paging',
          payload: {
            start: index,
            crawl_id,
          },
          options: {
            jobId: `debank:fetch:whales:paging:${crawl_id}:${index}:${Date.now()}`,
            removeOnComplete: true,
            removeOnFail: {
              age: 1000 * 60 * 60 * 1,
            },
            priority: 8,
            attempts: 10,
          },
        });
      });
      await this.insertWhaleList({ whales, crawl_id: +crawl_id });
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
    crawl_id: string;
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
      }));

      const projects_rows = project_list.map((project: any) => ({
        user_address,
        details: JSON.stringify(project).replace(/\\u0000/g, ''),
        crawl_id,
        crawl_time: now,
      }));

      tokens_rows.length &&
        (await bulkInsert({
          data: tokens_rows,
          table: 'debank-user-asset-portfolio-tokens',
        }));
      coins_rows.length &&
        (await bulkInsert({
          data: coins_rows,
          table: 'debank-user-asset-portfolio-coins',
        }));
      balances_rows.length &&
        (await bulkInsert({
          data: balances_rows,
          table: 'debank-user-asset-portfolio-balances-test',
        }));
      projects_rows.length &&
        (await bulkInsert({
          data: projects_rows,
          table: 'debank-user-asset-portfolio-projects',
        }));
    } catch (error) {
      this.logger.error(
        'error',
        '[insertUserAssetPortfolio:error]',
        JSON.stringify(error),
        JSON.stringify({
          user_address,
          token_list,
          coin_list,
          balance_list,
          project_list,
        }),
      );
      throw error;
    }
  }
  async addFetchSocialRankingByUsersAddressJob() {
    const { rows } = await this.querySocialRanking({
      select: 'user_address',
      //10000
      orderBy: 'rank',
      limit: 10000,
      order: 'DESC',
    });

    const crawl_id = await this.getCrawlId();
    for (const { user_address } of rows) {
      this.addJob({
        name: 'debank:fetch:social:user',
        payload: {
          user_address,
          crawl_id,
        },
        options: {
          jobId: `debank:fetch:social:user:${crawl_id}:${user_address}`,
          removeOnComplete: true,
          removeOnFail: {
            age: 1000 * 60 * 60 * 24,
          },
          priority: 10,
          attempts: 10,
        },
      });
    }
  }
  async addFetchTopHoldersByUsersAddressJob() {
    const { rows } = await this.queryAddressList({
      select: 'user_address',
      //10000
      limit: 10000,
      orderBy: 'debank_top_holders_time',
      order: 'DESC',
    });

    const crawl_id = await this.getCrawlId();
    for (const { user_address } of rows) {
      this.addJob({
        name: 'debank:fetch:social:user',
        payload: {
          user_address,
          crawl_id,
        },
        options: {
          jobId: `debank:fetch:social:user:${crawl_id}:${user_address}`,
          removeOnComplete: true,
          removeOnFail: {
            age: 1000 * 60 * 60 * 24,
          },
          priority: 10,
          attempts: 10,
        },
      });
    }
  }

  async getCrawlId() {
    const { rows } = await pgClient.query(`
      SELECT
        last_crawl_id
      FROM
        "debank-user-address-list"
      Where
        updated_at > now() - interval '1 day'
      ORDER BY
        updated_at DESC
          LIMIT 1
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
    const { rows } = await pgClient.query(`
      SELECT
        crawl_id
      FROM
        "debank-whales"
      Where
        updated_at > now() - interval '1 day'
      ORDER BY
        updated_at DESC
          LIMIT 1
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
  async getTopHoldersCrawlId() {
    const { rows } = await pgClient.query(`
      SELECT
        crawl_id
      FROM
        "debank-top-holders"
      Where
        updated_at > now() - interval '1 day'
      ORDER BY
        updated_at DESC
          LIMIT 1
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
    const { rows } = await pgClient.query(`
      SELECT
        crawl_id
      FROM
        "debank-coins"
      Where
        updated_at > now() - interval '1 day'
      ORDER BY
        updated_at DESC
          LIMIT 1
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
    await pgClient.query(
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
        this.logger.discord(
          'error',
          '[fetchCoins:error]',
          JSON.stringify(data),
          JSON.stringify({ status, error_code }),
        );
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
        this.logger.discord(
          'error',
          '[fetchTopHolders:error]',
          JSON.stringify(data),
          JSON.stringify({ status, error_code }),
        );
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
        this.logger.discord(
          'error',
          '[fetchTopHolders:error]',
          JSON.stringify(data),
          JSON.stringify({ status, error_code }),
        );
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
          name: 'debank:fetch:top-holders:page',
          payload: {
            id,
            start: index,
            limit: DebankAPI.Coin.top_holders.params.limit,
            crawl_id,
          },
          options: {
            jobId: `debank:fetch:top-holders:page:${crawl_id}:${id}:${index}`,
            removeOnComplete: true,
            removeOnFail: {
              age: 1000 * 60 * 60 * 1,
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
      for (const { symbol } of allCoins) {
        this.addJob({
          name: 'debank:fetch:top-holders',
          payload: {
            id: symbol,
            crawl_id,
          },
          options: {
            jobId: `debank:fetch:top-holders:${crawl_id}:${symbol}`,
            removeOnComplete: true,
            removeOnFail: {
              age: 1000 * 60 * 60 * 24,
            },
            priority: 10,
            // delay: 1000 * 10,
            attempts: 10,
          },
        });
      }
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
        this.logger.discord(
          'error',
          '[addFetchCoinsJob:error]',
          JSON.stringify(data),
          JSON.stringify({ status, error_code }),
        );
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
      }));
      await bulkInsert({
        table: 'debank-coins',
        data,
      });
    } catch (error) {
      this.logger.error('error', '[insertCoins:error]', JSON.stringify(error));
      throw error;
    }
  }

  async insertCoin({ coin, crawl_id, crawl_time }: { coin: any; crawl_id: number; crawl_time: Date }) {
    try {
      await pgClient.query(
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
      const { rows } = await pgClient.query(`
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
      await bulkInsert({
        data: values,
        table: 'debank-top-holders',
      });
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
      await pgClient.query(
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
      this.logger.error('error', '[insertTopHolder:error]', JSON.stringify(error));
      throw error;
    }
  }
  async queryTopHoldersByCrawlId({ symbol, crawl_id }: { symbol: string; crawl_id: number }) {
    try {
      const { rows } = await pgClient.query(
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
}
