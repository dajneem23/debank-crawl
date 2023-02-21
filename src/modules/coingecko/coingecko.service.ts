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
import { queryDebankCoins } from '../debank/debank.fnc';
import { formatDate } from '@/utils/date';

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

  private queue: Queue;

  private readonly jobs: {
    [key in CoinGeckoJobNames | 'default']?: (data?: any) => Promise<void>;
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
    default: () => {
      throw new Error('Invalid job name');
    },
  };

  constructor() {
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
    this.worker = new Worker('coingecko', this.workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 60 * 5,
      concurrency: 500,
      limiter: {
        max: 100,
        duration: 1,
      },
      metrics: {
        maxDataPoints: MetricsTime.TWO_WEEKS,
      },
    });
    this.logger.debug('info', '[initWorker:coingecko]', 'Worker initialized');

    this.initWorkerListeners(this.worker);
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

    this.initRepeatJobs();

    // queueEvents.on('completed', ({ jobId }) => {
    //   this.logger.debug('success', 'Job completed', { jobId });
    // });

    queueEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      this.logger.discord('error', 'coingecko:Job failed', jobId, failedReason);
    });
    //TODO: remove this
    // this.addFetchCoinGeckoAssetDetails();
  }
  private initRepeatJobs() {
    // this.addJob({
    //   name: 'coingecko:fetch:assets:list',
    //   data: {},
    //   otps: {
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
    //   otps: {
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
    //   otps: {
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
    //   otps: {
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
    //   otps: {
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
    //   otps: {
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
    //   otps: {
    //     repeatJobKey: 'coingecko:fetch:cryptocurrency:global',
    //     repeat: {
    //       pattern: '* 0 0 * * *',
    //     },
    //     // jobId: 'coingecko:fetch:cryptocurrency:global',
    //     removeOnFail: true,
    //     removeOnComplete: true,
    //   },
    // });
    this.addJob({
      name: CoinGeckoJobNames['coingecko:add:fetch:debank:coins'],
      otps: {
        repeatJobKey: CoinGeckoJobNames['coingecko:add:fetch:debank:coins'],
        jobId: CoinGeckoJobNames['coingecko:add:fetch:debank:coins'],
        removeOnComplete: {
          //remove after 1 hour
          age: 60 * 60,
        },
        removeOnFail: {
          //remove after 1 day
          age: 60 * 60 * 24,
        },
        repeat: {
          //repeat every 1 hour
          every: 1000 * 60 * 60,
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
          otps: {
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
          otps: {
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
    otps = {
      repeat: {
        pattern: '* 0 0 * * *',
      },
    },
  }: {
    name: CoinGeckoJobNames;
    data?: any;
    otps?: JobsOptions;
  }) {
    return this.queue.add(name, data, otps);
  }
  addBulkJobs({ jobs }: { jobs: { name: CoinGeckoJobNames; data: any; otps: JobsOptions }[] }) {
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
        otps: {
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
}
