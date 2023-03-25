import Container from 'typedi';
import Logger from '@/core/logger';
import { Job, JobsOptions, MetricsTime, Queue, QueueEvents, Worker } from 'bullmq';
import { env } from 'process';
import { DIRedisConnection } from '@/loaders/redis.loader';
import IORedis from 'ioredis';
import { CoinGeckoAPI } from '@/common/api';
import { CoinGeckoJobNames, fetchCoinGeckoDataJob } from './coingecko.job';
import {
  coinGeckoAssetModelToken,
  coinGeckoBlockchainModelToken,
  coinGeckoCategoriesModelToken,
  coinGeckoCoinPricesModelToken,
  coinGeckoCryptoCurrencyGlobalModelToken,
  coinGeckoExchangeModelToken,
} from './coingecko.model';
import { queryDebankCoins, queryDebankImportantTokens } from '../debank/debank.fnc';
import { createArrayDateByHours, createArrayDates, formatDate } from '@/utils/date';
import { Db, MongoClient } from 'mongodb';
import { Group3Alphabet } from '@/utils/text';
import { pgClientToken } from '@/loaders/pg.loader';

/**
 * @class CoingeckoAsset
 * @extends BaseService
 * @description AssetTrending Service for all coingeckoAsset related operations
 */
export class CoinGeckoService {
  private logger = new Logger('CoinGecko');

  private coinGeckoAssetModel = Container.get(coinGeckoAssetModelToken);

  private coinGeckoCategoriesModel = Container.get(coinGeckoCategoriesModelToken);

  private coinGeckoBlockchainModel = Container.get(coinGeckoBlockchainModelToken);

  private coinGeckoExchangeModel = Container.get(coinGeckoExchangeModelToken);

  private coinGeckoCryptoCurrencyGlobalModel = Container.get(coinGeckoCryptoCurrencyGlobalModelToken);

  private coinGeckoCoinPricesModel = Container.get(coinGeckoCoinPricesModelToken);

  private readonly redisConnection = Container.get(DIRedisConnection);

  private worker: Worker;

  private workerMarket: Worker;

  private queue: Queue;

  private queueMarket: Queue;

  dbClient: MongoClient;

  db: Db;

  private pgClient = Container.get(pgClientToken);

  private readonly jobs: {
    [key in CoinGeckoJobNames | 'default']?: (data?: any) => Promise<any>;
  } = {
    'coingecko:fetch:assets:list': this.fetchCoinGeckoAssetList,
    'coingecko:fetch:assets:details': this.fetchCoinGeckoAssetDetails,
    'coingecko:add:fetch:assets:details': this.addFetchCoinGeckoAssetDetails,
    'coingecko:fetch:categories:list': this.fetchCoinGeckoCategoriesList,
    'coingecko:fetch:blockchains:list': this.fetchCoinGeckoBlockchainsList,
    'coingecko:fetch:exchanges:list': this.fetchCoinGeckoBlockchainsList,
    'coingecko:fetch:exchanges:details': this.fetchCoinGeckoExchangeDetails,
    'coingecko:add:fetch:exchanges:details': this.addFetchCoinGeckoExchangeDetails,
    'coingecko:fetch:cryptocurrency:global': this.fetchCoinGeckoCryptoCurrencyGlobal,
    'coingecko:fetch:coin:details': this.fetchDebankCoinDetails,
    'coingecko:add:fetch:debank:coins': this.addFetchCoinPriceFromDebankCoins,

    'coingecko:fetch:important:token:price': this.fetchImportantTokenPrice,

    'coingecko:add:fetch:important:token:price': this.addFetchImportantTokenPrice,

    default: () => {
      throw new Error('Invalid job name');
    },
  };

  constructor() {
    if (env.MODE === 'production') {
      this.init();
    }
  }

  async init() {
    await this.initMongoDB();
    this.initWorker();
    // Init Queue
    this.initQueue();
  }
  async initMongoDB() {
    this.dbClient = await MongoClient.connect(env.MONGO_URI);
    this.dbClient.on('disconnected', () => this.logger.warn('disconnected', 'MongoDB coingecko disconnected'));
    this.dbClient.on('reconnected', () => this.logger.success('reconnected', 'MongoDB coingecko disconnected'));
    this.db = this.dbClient.db('important-tokens');
    this.logger.success('connected', 'CoinGeckoService:MongoDB');
  }
  /**
   *  @description init BullMQ Worker
   */
  private initWorker() {
    this.worker = new Worker('coingecko', this.workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 60 * 5,
      concurrency: 10,
      limiter: {
        max: 60,
        duration: 60 * 1000,
      },
      metrics: {
        maxDataPoints: MetricsTime.TWO_WEEKS,
      },
    });
    this.workerMarket = new Worker('coingecko-market', this.workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 60 * 5,
      concurrency: 10,
      // limiter: {
      //   max: 60,
      //   duration: 60 * 1000,
      // },
      metrics: {
        maxDataPoints: MetricsTime.TWO_WEEKS,
      },
    });

    this.initWorkerListeners(this.worker);
    this.logger.debug('info', '[initWorker:coingecko]', 'Worker initialized');
  }
  /**
   *  @description init BullMQ Queue
   */
  private initQueue() {
    this.queue = new Queue('coingecko', {
      connection: this.redisConnection,
      defaultJobOptions: {
        // The total number of attempts to try the job until it completes
        attempts: 5,
        // Backoff setting for automatic retries if the job fails
        backoff: { type: 'exponential', delay: 1000 * 60 * 0.5 },
        removeOnComplete: {
          age: 60 * 60,
        },
        removeOnFail: {
          age: 60 * 60,
        },
      },
    });

    const queueEvents = new QueueEvents('coingecko', {
      connection: this.redisConnection,
    });

    queueEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      this.logger.discord('error', 'coingecko:Job failed', jobId, failedReason);
    });

    this.queueMarket = new Queue('coingecko-market', {
      connection: this.redisConnection,
      defaultJobOptions: {
        // The total number of attempts to try the job until it completes
        attempts: 5,
        // Backoff setting for automatic retries if the job fails
        backoff: { type: 'exponential', delay: 1000 * 60 * 0.5 },
        removeOnComplete: {
          age: 60 * 60,
        },
        removeOnFail: {
          age: 60 * 60,
        },
      },
    });

    const queueMarketEvents = new QueueEvents('coingecko-market', {
      connection: this.redisConnection,
    });

    queueMarketEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      this.logger.discord('error', 'coingecko:Job failed', jobId, failedReason);
    });

    this.initRepeatJobs();

    //TODO: remove this
    // this.addFetchCoinGeckoAssetDetails();
  }
  private initRepeatJobs() {
    // this.addJob({
    //   name: 'coingecko:fetch:assets:list',
    //   data: {},
    //   opts: {
    //     repeatJobKey: 'coingecko:fetch:assets:list',
    //     repeat: {
    //       pattern: '0 0 * * SUN',
    //     },
    //     // jobId: 'coingecko:fetch:assets:list',
    //     removeOnFail: true,
    //     removeOnComplete: true,
    //   },
    // });
    // this.addJob({
    //   name: 'coingecko:add:fetch:assets:details',
    //   data: {},
    //   opts: {
    //     repeatJobKey: 'coingecko:add:fetch:assets:details',
    //     repeat: {
    //       pattern: '* 0 0 * * *',
    //     },
    //     // jobId: 'coingecko:fetch:assets:details',
    //     removeOnFail: true,
    //     removeOnComplete: true,
    //   },
    // });
    // this.addJob({
    //   name: 'coingecko:fetch:categories:list',
    //   data: {},
    //   opts: {
    //     repeatJobKey: 'coingecko:fetch:categories:list',
    //     repeat: {
    //       pattern: '0 0 * * SUN',
    //     },
    //     // jobId: 'coingecko:fetch:categories:list',
    //     removeOnFail: true,
    //     removeOnComplete: true,
    //   },
    // });
    // this.addJob({
    //   name: 'coingecko:fetch:blockchains:list',
    //   data: {},
    //   opts: {
    //     repeatJobKey: 'coingecko:fetch:blockchains:list',
    //     repeat: {
    //       pattern: '0 0 * * SUN',
    //     },
    //     // jobId: 'coingecko:fetch:blockchains:list',
    //     removeOnFail: true,
    //     removeOnComplete: true,
    //   },
    // });
    // this.addJob({
    //   name: 'coingecko:fetch:exchanges:list',
    //   data: {},
    //   opts: {
    //     repeatJobKey: 'coingecko:fetch:exchanges:list',
    //     repeat: {
    //       pattern: '0 0 * * SUN',
    //     },
    //     // jobId: 'coingecko:fetch:exchanges:list',
    //     removeOnFail: true,
    //     removeOnComplete: true,
    //   },
    // });
    // this.addJob({
    //   name: 'coingecko:add:fetch:exchanges:details',
    //   data: {},
    //   opts: {
    //     repeatJobKey: 'coingecko:add:fetch:exchanges:details',
    //     repeat: {
    //       pattern: '* 0 0 * * *',
    //     },
    //     // jobId: 'coingecko:fetch:exchanges:details',
    //     removeOnFail: true,
    //     removeOnComplete: true,
    //   },
    // });
    // this.addJob({
    //   name: 'coingecko:fetch:cryptocurrency:global',
    //   data: {},
    //   opts: {
    //     repeatJobKey: 'coingecko:fetch:cryptocurrency:global',
    //     repeat: {
    //       pattern: '* 0 0 * * *',
    //     },
    //     // jobId: 'coingecko:fetch:cryptocurrency:global',
    //     removeOnFail: true,
    //     removeOnComplete: true,
    //   },
    // });
    // this.addJob({
    //   name: CoinGeckoJobNames['coingecko:add:fetch:debank:coins'],
    //   opts: {
    //     repeatJobKey: CoinGeckoJobNames['coingecko:add:fetch:debank:coins'],
    //     jobId: CoinGeckoJobNames['coingecko:add:fetch:debank:coins'],
    //     removeOnComplete: {
    //       //remove after 1 hour
    //       age: 60 * 60,
    //     },
    //     removeOnFail: {
    //       //remove after 1 day
    //       age: 60 * 60 * 24,
    //     },
    //     repeat: {
    //       //repeat every 1 hour
    //       every: 1000 * 60 * 60,
    //       // pattern: '* 0 0 * * *',
    //     },
    //     //delay for 5 minutes when the job is added for done other jobs
    //     delay: 1000 * 60 * 5,
    //     priority: 1,
    //     attempts: 5,
    //   },
    // });

    this.addJob({
      name: CoinGeckoJobNames['coingecko:add:fetch:important:token:price'],
      opts: {
        repeatJobKey: CoinGeckoJobNames['coingecko:add:fetch:important:token:price'],
        jobId: CoinGeckoJobNames['coingecko:add:fetch:important:token:price'],
        removeOnComplete: {
          //remove after 1 hour
          age: 60,
        },
        removeOnFail: {
          //remove after 1 day
          age: 60,
        },
        repeat: {
          //repeat every 1 hour
          every: 1000 * 60 * 5,
          // pattern: '* 0 0 * * *',
        },
        //delay for 5 minutes when the job is added for done other jobs
        delay: 1000 * 60 * 5,
        priority: 1,
        attempts: 5,
      },
    });
  }
  async fetchCoinGeckoAssetList() {
    try {
      const { data } = await CoinGeckoAPI.fetch({
        endpoint: CoinGeckoAPI.Coins.list.endpoint,
        params: CoinGeckoAPI.Coins.list.params,
      });
      this.logger.debug('info', 'fetchCoinGeckoAssetList', { num: data.length });
      for (const asset of data) {
        const { id, name, symbol, platforms } = asset;

        await this.coinGeckoAssetModel._collection.findOneAndUpdate(
          { id },
          {
            $set: {
              id,
              name,
              symbol,
              platforms,
              updated_at: new Date(),
              updated_by: 'system',
            },
            $setOnInsert: {
              created_at: new Date(),
              created_by: 'system',
            },
          },
          { upsert: true },
        );
      }
      // this.logger.debug('success', 'coingecko:fetchCoinGeckoAssetList');
    } catch (error) {
      this.logger.discord('error', 'coingecko:fetchCoinGeckoAssetList', JSON.stringify(error));
      throw error;
    }
  }
  async addFetchCoinGeckoAssetDetails() {
    try {
      const assets = await this.coinGeckoAssetModel
        .get([
          {
            $project: {
              id: 1,
            },
          },
        ])
        .toArray();
      this.logger.debug('info', 'coingecko:fetchCoinGeckoAssetDetails', { num: assets.length });
      for (const { id } of assets) {
        this.addJob({
          name: CoinGeckoJobNames['coingecko:fetch:assets:details'],
          data: { id },
          opts: {
            jobId: `coingecko:fetch:assets:details:${id}:${Date.now()}`,
            removeOnFail: {
              age: 1000 * 60 * 60 * 24 * 7,
            },
            removeOnComplete: {
              age: 1000 * 60 * 60 * 24 * 7,
            },
            delay: 1000 * 30,
          },
        });
      }
      this.logger.debug('success', 'coingecko:fetchCoinGeckoAssetDetails');
    } catch (error) {
      this.logger.discord('error', 'coingecko:fetchCoinGeckoAssetDetails', JSON.stringify(error));
      throw error;
    }
  }

  async fetchCoinGeckoAssetDetails({ id }: { id: string }) {
    try {
      if (!id) {
        throw new Error('coingecko:fetchCoinGeckoAssetDetails id is required');
      }
      const { data, status } = await CoinGeckoAPI.fetch({
        endpoint: `${CoinGeckoAPI.Coins.detail.endpoint}/${id}`,
        params: CoinGeckoAPI.Coins.detail.params,
      });
      const { id: _id, symbol, name, ...details } = data;
      await this.coinGeckoAssetModel._collection.findOneAndUpdate(
        { id },
        {
          $set: {
            details,
            updated_at: new Date(),
            updated_by: 'system',
          },
          $setOnInsert: {
            created_at: new Date(),
            created_by: 'system',
          },
        },
        { upsert: true },
      );
      // this.logger.debug('success', 'coingecko:fetchCoinGeckoAssetDetails', { id });
      return {
        id,
        status,
        data,
        symbol,
        market_data: data?.market_data,
      };
    } catch (error) {
      this.logger.discord('error', 'coingecko:fetchCoinGeckoAssetDetails', JSON.stringify(error));
      throw error;
    }
  }
  async fetchCoinGeckoCategoriesList() {
    try {
      const { data } = await CoinGeckoAPI.fetch({
        endpoint: CoinGeckoAPI.Categories.listWithMarketData.endpoint,
        params: CoinGeckoAPI.Categories.listWithMarketData.params,
      });
      this.logger.debug('info', 'coingecko:fetchCoinGeckoCategoriesList', { num: data.length });
      for (const { id, ...rest } of data) {
        await this.coinGeckoCategoriesModel._collection.findOneAndUpdate(
          { id },
          {
            $set: {
              id,
              ...rest,
              updated_at: new Date(),
              updated_by: 'system',
            },
            $setOnInsert: {
              created_at: new Date(),
              created_by: 'system',
            },
          },
          { upsert: true },
        );
      }
      this.logger.debug('success', 'coingecko:fetchCoinGeckoCategoriesList');
    } catch (error) {
      this.logger.discord('error', 'coingecko:fetchCoinGeckoCategoriesList', JSON.stringify(error));
      throw error;
    }
  }
  async fetchCoinGeckoBlockchainsList() {
    try {
      const { data, status } = await CoinGeckoAPI.fetch({
        endpoint: CoinGeckoAPI.Blockchains.list.endpoint,
      });
      this.logger.debug('info', 'coingecko:fetchCoinGeckoBlockchainsList', { num: data.length });
      if (status != 200) {
        this.logger.discord('error', 'coingecko:fetchCoinGeckoBlockchainsList', JSON.stringify({ status, data }));
        return;
      }
      for (const { id, ...rest } of data) {
        await this.coinGeckoBlockchainModel._collection.findOneAndUpdate(
          { id },
          {
            $set: {
              id,
              ...rest,
              updated_at: new Date(),
              updated_by: 'system',
            },
            $setOnInsert: {
              created_at: new Date(),
              created_by: 'system',
            },
          },
          { upsert: true },
        );
      }
      this.logger.debug('success', 'coingecko:fetchCoinGeckoBlockchainsList');
    } catch (error) {
      this.logger.discord('error', 'coingecko:fetchCoinGeckoBlockchainsList', JSON.stringify(error));
      throw error;
    }
  }
  async fetchCoinGeckoExchangeList() {
    try {
      const { data, status } = await CoinGeckoAPI.fetch({
        endpoint: CoinGeckoAPI.Exchanges.list.endpoint,
      });
      this.logger.debug('info', 'coingecko:fetchCoinGeckoExchangeList', { num: data.length });
      if (status != 200) {
        this.logger.discord('error', 'coingecko:fetchCoinGeckoExchangeList', JSON.stringify({ status, data }));
        return;
      }
      for (const { id, name } of data) {
        await this.coinGeckoExchangeModel._collection.findOneAndUpdate(
          { id },
          {
            $set: {
              id,
              name,
              updated_at: new Date(),
              updated_by: 'system',
            },
            $setOnInsert: {
              created_at: new Date(),
              created_by: 'system',
            },
          },
          { upsert: true },
        );
      }
      this.logger.debug('success', 'coingecko:fetchCoinGeckoExchangeList');
    } catch (error) {
      this.logger.discord('error', 'coingecko:fetchCoinGeckoExchangeList', JSON.stringify(error));
      throw error;
    }
  }

  async addFetchCoinGeckoExchangeDetails() {
    try {
      const exchanges = await this.coinGeckoExchangeModel
        .get([
          {
            $project: {
              id: 1,
            },
          },
        ])
        .toArray();
      for (const { id } of exchanges) {
        this.addJob({
          name: CoinGeckoJobNames['coingecko:fetch:exchanges:details'],
          data: { id },
          opts: {
            jobId: `coingecko:fetch:exchanges:details:${id}:${Date.now()}`,
            removeOnFail: {
              age: 1000 * 60 * 60 * 24 * 7,
            },
            removeOnComplete: {
              age: 1000 * 60 * 60 * 24 * 7,
            },
            delay: 1000 * 30,
          },
        });
      }

      this.logger.debug('success', 'coingecko:addFetchCoinGeckoExchangeDetails');
    } catch (error) {
      this.logger.discord('error', 'coingecko:addFetchCoinGeckoExchangeDetails', JSON.stringify(error));
      throw error;
    }
  }
  async fetchCoinGeckoExchangeDetails({ id }: { id: string }) {
    try {
      if (!id) {
        throw new Error('coingecko:fetchCoinGeckoExchangeDetails id is required');
      }
      const { data, status } = await CoinGeckoAPI.fetch({
        endpoint: `${CoinGeckoAPI.Exchanges.details.endpoint}/${id}`,
      });
      const { name, ...details } = data;
      await this.coinGeckoExchangeModel._collection.findOneAndUpdate(
        { id },
        {
          $set: {
            details,
            updated_at: new Date(),
            updated_by: 'system',
          },
          $setOnInsert: {
            created_at: new Date(),
            created_by: 'system',
          },
        },
        { upsert: true },
      );
    } catch (error) {
      this.logger.discord('error', 'coingecko:fetchCoinGeckoExchangeDetails', JSON.stringify(error));
      throw error;
    }
  }

  async fetchCoinGeckoCryptoCurrencyGlobal() {
    try {
      const {
        data: { data },
      } = await CoinGeckoAPI.fetch({
        endpoint: CoinGeckoAPI.Global.cryptoCurrencyGlobal.endpoint,
      });

      await this.coinGeckoCryptoCurrencyGlobalModel._collection.insertOne({
        ...data,
        updated_at: new Date(),
        updated_by: 'system',
      });

      this.logger.debug('success', 'coingecko:fetchCoinGeckoCryptoCurrencyGlobal');
    } catch (error) {
      this.logger.discord('error', 'coingecko:fetchCoinGeckoCryptoCurrencyGlobal', JSON.stringify(error));
      throw error;
    }
  }

  /**
   * @description add job to queue
   */
  addJob({
    name,
    data = {},
    opts = {
      repeat: {
        pattern: '* 0 0 * * *',
      },
    },
  }: {
    name: CoinGeckoJobNames;
    data?: any;
    opts?: JobsOptions;
  }) {
    return this.queue.add(name, data, opts);
  }
  addBulkJobs({ jobs }: { jobs: { name: CoinGeckoJobNames; data: any; opts: JobsOptions }[] }) {
    return this.queue.addBulk(jobs);
    // .then((job) => this.logger.debug(`success`, `[addJob:success]`, { id: job.id, name, data }))
  }
  /**
   * Initialize Worker listeners
   * @private
   */
  private initWorkerListeners(worker: Worker) {
    // Completed
    // worker.on('completed', ({ id, name, data }: Job<fetchCoinGeckoDataJob>) => {
    //   this.logger.discord('success', '[job:coingecko:completed]', id, name, JSON.stringify(data));
    // });
    // Failed
    worker.on('failed', ({ id, name, data, failedReason }: Job<fetchCoinGeckoDataJob>, error: Error) => {
      this.logger.discord(
        'error',
        '[job:coingecko:error]',
        id,
        name,
        failedReason,
        JSON.stringify(data),
        JSON.stringify(error),
      );
    });
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

  async addFetchCoinPriceFromDebankCoins() {
    try {
      const { rows } = await queryDebankCoins({
        select: 'symbol,details,cg_id',
      });
      const crawl_id = await this.getCoinPricesCrawlId();
      const jobs = rows.map(({ symbol, details, cg_id }) => ({
        name: CoinGeckoJobNames['coingecko:fetch:coin:details'],
        data: {
          id: cg_id || details.id,
          crawl_id,
        },
        opts: {
          jobId: `coingecko:fetch:coin:details:${symbol}:${Date.now()}`,
          removeOnFail: {
            age: 60 * 60,
          },
          removeOnComplete: {
            age: 60 * 60,
          },
          priority: 10,
          // delay: 1000 * 10,
          attempts: 10,
        },
      }));
      await this.addBulkJobs({ jobs });
    } catch (error) {
      this.logger.discord('error', 'debank:addFetchCoinPriceFromDebankCoins', JSON.stringify(error));
      throw error;
    }
  }

  async fetchDebankCoinDetails({ id, crawl_id }: { id: string; crawl_id: number }) {
    try {
      const { data, status } = await CoinGeckoAPI.fetch({
        endpoint: `${CoinGeckoAPI.Coins.detail.endpoint}/${id}`,
        params: {
          market_data: true,
        },
      });
      if (status !== 200) {
        throw new Error('fetchCoinDetails:fail');
      }
      const {
        market_data: {
          current_price: { usd },
          ath: { usd: ath_usd },
          high_24h: { usd: high_24h_usd },
          low_24h: { usd: low_24h_usd },
          price_change_24h,
          price_change_percentage_24h,
          total_volume: { usd: total_volume_usd },
        },
        symbol,
      } = data;
      const crawl_date = formatDate(new Date(), 'YYYYMMDD');
      await this.coinGeckoCoinPricesModel._collection.findOneAndUpdate(
        {
          crawl_date: +crawl_date,
        },
        {
          $max: {
            last_crawl_id: +crawl_id,
          },
          $set: {
            updated_at: new Date(),
            [`coins.${symbol}.prices.${crawl_id}`]: {
              price: +usd,
              ath: +ath_usd,
              high: +high_24h_usd,
              low: +low_24h_usd,
              price_change: +price_change_24h,
              price_change_percentage: +price_change_percentage_24h,
              volume: +total_volume_usd,
              crawl_id: +crawl_id,
              crawl_time: new Date(),
            },
          },
          $setOnInsert: {
            created_at: new Date(),
          },
        },
        {
          upsert: true,
        },
      );
    } catch (error) {
      this.logger.discord('error', 'coingecko:fetchCoinDetails', JSON.stringify(error));
      throw error;
    }
  }
  async getCoinPricesCrawlId() {
    try {
      const today = formatDate(new Date(), 'YYYYMMDD');
      const { last_crawl_id } = (await this.coinGeckoCoinPricesModel._collection.findOne({
        crawl_date: +today,
      })) || {
        last_crawl_id: 0,
      };
      return last_crawl_id ? last_crawl_id + 1 : +`${today}01`;
    } catch (error) {
      this.logger.discord('error', 'coingecko:getCoinPricesCrawlId', JSON.stringify(error));
      throw error;
    }
  }

  async fetchImportantTokenPrice({ id }) {
    const { market_data, symbol } = await this.fetchCoinGeckoAssetDetails({ id });
    const firstLetter = symbol.charAt(0).toLowerCase();
    const collection = this.db.collection(`market-data_${Group3Alphabet[firstLetter as keyof typeof Group3Alphabet]}`);
    await collection.findOneAndUpdate(
      {
        symbol,
        created_at: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
      {
        $setOnInsert: {
          symbol,
          created_at: new Date(),
        },
        $push: {
          market_data: {
            ...market_data,
          },
        } as any,
        $set: {
          updated_at: new Date(),
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
      },
    );
  }

  async addFetchImportantTokenPrice() {
    const { rows } = await queryDebankImportantTokens();
    const jobs = rows.map(({ symbol, cg_id }) => ({
      name: CoinGeckoJobNames['coingecko:fetch:important:token:price'],
      data: {
        id: cg_id,
      },
      opts: {
        jobId: `coingecko:fetch:important:token:price:${cg_id}:${Date.now()}`,
        removeOnFail: {
          age: 60,
        },
        removeOnComplete: {
          age: 60,
        },
        priority: 10,
        // delay: 1000 * 10,
        attempts: 10,
      },
    }));
    await this.addBulkJobs({ jobs });
  }
}
