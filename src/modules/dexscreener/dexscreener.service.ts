import { DexScreenerAPI } from '@/common/api';
import Logger from '@/core/logger';
import { pgPoolToken } from '@/loaders/pgLoader';
import { DIRedisConnection } from '@/loaders/redisClientLoader';
import { Job, JobsOptions, MetricsTime, Queue, QueueEvents, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { env } from 'process';
import Container from 'typedi';
import { DexscreenerJob, DexscreenerJobNames } from './dexscreener.job';
import { Pair, TradingHistory } from './dexscreener.type';
const pgPool = Container.get(pgPoolToken);
export class DexScreenerService {
  private logger = new Logger('DexScreenerService');

  private readonly redisConnection = Container.get(DIRedisConnection);

  private worker: Worker;

  private queue: Queue;

  // private queueScheduler: QueueScheduler;

  private readonly jobs: {
    [key in DexscreenerJobNames | 'default']?: (data?: any) => Promise<void>;
  } = {
    'dexscreener:fetch:trading-histories': this.fetchTradingHistories,
    'dexscreener:add:fetch:trading-histories': this.addFetchTradingHistoriesJob,
    default: () => {
      throw new Error('Invalid job name');
    },
  };

  constructor() {
    // this.fetchTVLProtocolDetails();
    // this.fetchTVLChains();
    // this.fetchTVLCharts();
    //TODO: REMOVE THIS LATER
    // this.fetchTradingHistories({
    //   baseToken: 'CHZ',
    //   quoteToken: 'USDT',
    //   chain: 'ethereum',
    //   dex: 'uniswap',
    // });
    // setInterval(() => {
    //   this.logger.discord('success', 'DexScreenerService is running');
    // }, 1000);
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
    this.worker = new Worker('dexscreener', this.workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 60,
      concurrency: 50,
      limiter: {
        max: 10,
        duration: 60 * 1000,
      },
      metrics: {
        maxDataPoints: MetricsTime.TWO_WEEKS,
      },
    });
    this.logger.debug('info', '[initWorker:dexscreener]', 'Worker initialized');
    this.initWorkerListeners(this.worker);
  }
  /**
   *  @description init BullMQ Queue
   */
  private initQueue() {
    this.queue = new Queue('dexscreener', {
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
    // this.queueScheduler = new QueueScheduler('dexscreener', {
    //   connection: this.redisConnection,
    // });
    const queueEvents = new QueueEvents('dexscreener', {
      connection: this.redisConnection,
    });
    // TODO: ENABLE THIS
    // this.initRepeatJobs();

    // queueEvents.on('completed', ({ jobId }) => {
    //   this.logger.debug('success', 'Job completed', { jobId });
    // });

    queueEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      this.logger.debug('error', 'dexscreener:Job failed', jobId, failedReason);
    });
    // TODO: REMOVE THIS LATER
    // this.addFetchTVLProtocolTVLJob();
  }
  // private initRepeatJobs() {}
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
    name: DexscreenerJobNames;
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
    worker.on('completed', ({ id, data, name }: Job<DexscreenerJob>) => {
      this.logger.discord('success', '[job:dexscreener:completed]', id, name, JSON.stringify(data));
    });
    // Failed
    worker.on('failed', ({ id, name, data, failedReason }: Job<DexscreenerJob>, error: Error) => {
      this.logger.discord(
        'error',
        '[job:dexscreener:error]',
        id,
        name,
        failedReason,
        JSON.stringify(data),
        JSON.stringify(error),
      );
    });
  }
  workerProcessor({ name, data }: Job<DexscreenerJob>): Promise<void> {
    // this.logger.debug('info', `[dexscreener:workerProcessor:run]`, { name, data });
    return this.jobs[name as keyof typeof this.jobs]?.call(this, data) || this.jobs.default();
  }
  async fetchTradingHistories({
    baseToken,
    quoteToken,
    chain,
    dex,
    tb,
  }: {
    baseToken: string;
    quoteToken: string;
    chain: string;
    dex: string;
    tb?: number;
  }) {
    try {
      const { quoteTokenAddress, pairAddress, baseTokenAddress } = await this.searchPairs({
        baseToken,
        quoteToken,
        chain,
      });

      const { data, status } = await DexScreenerAPI.fetch({
        endpoint: `${DexScreenerAPI.TradingHistory.recent.endpoint}/${chain}/${pairAddress}`,
        params: {
          q: baseTokenAddress,
          tb,
        },
      });
      if (status !== 200) {
        throw new Error('dexscreener:fetchTradingHistories:Invalid status');
      }

      const { tradingHistory: _tradingHistory } = data;
      const tradingHistory = _tradingHistory.map(
        ({ blockNumber, blockTimestamp, priceUsd, volumeUsd, amount0, amount1, ...rest }: any) => ({
          blockNumber,
          blockTimestamp: new Date(blockTimestamp),
          priceUsd: priceUsd.replace(/,/g, ''),
          volumeUsd: volumeUsd.replace(/,/g, ''),
          amount0: amount0.replace(/,/g, ''),
          amount1: amount1.replace(/,/g, ''),
          updatedAt: new Date(),
          baseToken,
          quoteToken,
          baseTokenAddress,
          quoteTokenAddress,
          pairAddress,
          ...rest,
        }),
      );
      for (const item of tradingHistory) {
        await this.insertTradingHistory({
          ...item,
        });
      }
    } catch (error) {
      this.logger.discord('error', '[fetchTradingHistory:error]', JSON.stringify(error));
      throw error;
    }
  }
  async searchPairs({ baseToken, quoteToken, chain }: { baseToken: string; quoteToken: string; chain: string }) {
    try {
      const pairsFromDatabase = await this.searchPairsFromDatabase({
        baseToken,
        quoteToken,
        chain,
      });

      const pairs = pairsFromDatabase.length
        ? pairsFromDatabase
        : await this.searchPairsFromDexScreener({
            baseToken,
            quoteToken,
          });
      if (!pairsFromDatabase.length) {
        pairs.forEach(
          ({
            pairAddress,
            chainId,
            dexId,
            baseToken,
            quoteToken,
            priceNative,
            priceUsd,
            txns,
            volume,
            priceChange,
            liquidity,
            fdv,
            updatedAt = new Date(),
            url,
          }: Pair) => {
            this.insertPair({
              pairAddress,
              chainId,
              dexId,
              baseToken,
              quoteToken,
              priceNative: priceNative.replace(/,/g, ''),
              priceUsd: priceUsd.replace(/,/g, ''),
              txns,
              volume,
              priceChange,
              liquidity,
              fdv,
              updatedAt,
              url,
            });
          },
        );
      }
      if (!pairs.length) {
        this.logger.discord('error', '[searchPairs:error]', baseToken, quoteToken, chain);
        throw new Error('No pairs found');
      }
      const baseTokenKey = pairsFromDatabase.length ? 'base_token' : 'baseToken';
      const quoteTokenKey = pairsFromDatabase.length ? 'quote_token' : 'quoteToken';
      const pairAddressKey = pairsFromDatabase.length ? 'pair_address' : 'pairAddress';
      const chainIdKey = pairsFromDatabase.length ? 'chain_id' : 'chainId';
      const matchedPair = pairs.find(
        ({
          [baseTokenKey]: { symbol: baseSymbol },
          [quoteTokenKey]: { symbol: quoteSymbol },
          [chainIdKey]: chainId,
        }: any) =>
          baseSymbol.toLowerCase() === baseToken.toLowerCase() &&
          quoteSymbol.toLowerCase() === quoteToken.toLowerCase() &&
          chainId.toLowerCase() == chain.toLowerCase(),
      );
      if (!matchedPair) {
        this.logger.discord('error', '[searchPairs:error]', baseToken, quoteToken, chain, pairs);
        throw new Error('No matchedPair found');
      }
      const baseTokenAddress = matchedPair[baseTokenKey].address;
      const quoteTokenAddress = matchedPair[quoteTokenKey].address;
      const pairAddress = matchedPair[pairAddressKey];
      return {
        baseTokenAddress,
        pairAddress,
        quoteTokenAddress,
      };
    } catch (error) {
      this.logger.discord('error', '[searchPairs:error]', JSON.stringify(error));
      throw error;
    }
  }
  async searchPairsFromDexScreener({ baseToken, quoteToken }: { baseToken: string; quoteToken: string }) {
    try {
      const { data, status } = await DexScreenerAPI.fetch({
        endpoint: `${DexScreenerAPI.Pairs.search.endpoint}`,
        params: {
          q: `${baseToken} ${quoteToken}`,
        },
      });
      const { pairs } = data;
      return pairs;
    } catch (error) {
      this.logger.discord('error', '[searchPairsFromDexScreener:error]', baseToken, quoteToken, JSON.stringify(error));
      return [];
    }
  }
  async searchPairsFromDatabase({
    baseToken,
    quoteToken,
    chain,
  }: {
    baseToken: string;
    quoteToken: string;
    chain: string;
  }) {
    try {
      // return pair;
      const pairs = await pgPool.query(
        `
        SELECT * FROM public."dexscreener-token-pairs"
        WHERE base_token ->> 'symbol' ILIKE  $1 AND quote_token ->> 'symbol' ILIKE $2 AND chain_id ILIKE $3
        `,
        [baseToken, quoteToken, chain],
      );
      return pairs?.rows || [];
    } catch (error) {
      this.logger.discord(
        'error',
        '[searchPairsFromDatabase:error]',
        baseToken,
        quoteToken,
        chain,
        JSON.stringify(error),
      );
      return [];
    }
  }
  async insertTradingHistory({
    blockNumber,
    blockTimestamp,
    txnHash,
    logIndex,
    type,
    priceUsd,
    volumeUsd,
    amount0,
    amount1,
    updatedAt,
    baseToken,
    quoteToken,
    baseTokenAddress,
    quoteTokenAddress,
    pairAddress,
  }: TradingHistory) {
    await pgPool
      .query(
        `INSERT INTO public."dexscreener-trading-histories" (
        block_number,
        block_timestamp,
        txn_hash,
        log_index,
        type,
        price_usd,
        volume_usd,
        amount0,
        amount1,
        updated_at,
        base_token,
        quote_token,
        base_token_address,
        quote_token_address,
        pair_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) ON CONFLICT (txn_hash) DO NOTHING`,
        [
          blockNumber,
          blockTimestamp,
          txnHash,
          logIndex,
          type,
          priceUsd,
          volumeUsd,
          amount0,
          amount1,
          updatedAt,
          baseToken,
          quoteToken,
          baseTokenAddress,
          quoteTokenAddress,
          pairAddress,
        ],
      )
      .catch((error) => {
        this.logger.discord('error', '[insertTradingHistoryw:error]', JSON.stringify(error));
      });
  }
  async insertPair({
    pairAddress,
    chainId,
    dexId,
    baseToken,
    quoteToken,
    priceNative,
    priceUsd,
    txns,
    volume,
    priceChange,
    liquidity,
    fdv,
    updatedAt = new Date(),
    url,
  }: Pair) {
    await pgPool
      .query(
        `INSERT INTO public."dexscreener-token-pairs" (
        pair_address,
        chain_id,
        dex_id,
        base_token,
        quote_token,
        price_native,
        price_usd,
        txns,
        volume,
        price_change,
        liquidity,
        fdv,
        updated_at,
        url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          pairAddress,
          chainId,
          dexId,
          baseToken,
          quoteToken,
          priceNative,
          priceUsd,
          txns,
          volume,
          priceChange,
          liquidity,
          fdv,
          updatedAt,
          url,
        ],
      )
      .catch((error) => {
        this.logger.discord('error', '[insertPair:error]', JSON.stringify(error));
      });
  }
  async addFetchTradingHistoriesJob() {
    try {
    } catch (error) {
      this.logger.discord('error', '[addFetchTradingHistoriesJob:error]', JSON.stringify(error));
      throw error;
    }
  }
}
