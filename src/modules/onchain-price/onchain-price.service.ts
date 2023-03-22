import { DexScreenerAPI } from '@/common/api';
import Logger from '@/core/logger';
import { pgPoolToken } from '@/loaders/pg.loader';
import { DIRedisConnection } from '@/loaders/redis.loader';
import { Job, JobsOptions, MetricsTime, Queue, QueueEvents, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { env } from 'process';
import Container from 'typedi';
import { searchPairsFromDexScreener } from '../dexscreener/dexscreener.func';
import { MongoClient } from 'mongodb';
import { DIMongoClient } from '@/loaders/mongoDB.loader';
import { getMgOnChainDbName } from '@/common/db';
import Bluebird from 'bluebird';
import { findPairsOfSymbol } from '../pair-book/pair-book.func';
import { QUOTE_TOKENS, QUOTE_TOKEN_DECIMALS } from '@/service/ethers/quoteToken';
import { PairBookChainIds } from '../pair-book/pair-book.type';
import { find, uniq } from 'lodash';
import { getPairPriceAtBlock } from '@/service/ethers/price';
import { DIDiscordClient } from '@/loaders/discord.loader';
import { queryRedisKeys } from '@/utils/redis';
import { daysDiff } from '@/utils/date';
import { OnchainPriceJob } from './onchain-price.job';
export class OnChainPriceService {
  private logger = new Logger('PairBookService');

  private readonly redisConnection = Container.get(DIRedisConnection);

  private worker: Worker;

  private queue: Queue;

  private mgClient: MongoClient = Container.get(DIMongoClient);

  private readonly jobs: {
    [key in OnchainPriceJob | 'default']?: (data?: any) => Promise<void>;
  } = {
    'update:transaction:usd-value': this.updateTransactionUsdValue,
    'add:update:transaction:usd-value': this.addUpdateUsdValueOfTransactionsJob,
    default: () => {
      throw new Error('Invalid job name');
    },
  };

  constructor() {
    // this.updateTransactionUsdValue({
    //   hash: '0xf6d2241a6c6ae935f4df7fb3f2b7a47bea27b23961c6e8116603bf0bdc4710db',
    //   amount: 6659.578806074372,
    //   chain_id: 56,
    //   timestamp: 1679292909,
    //   block: 26620867,
    //   token_address: '0x2c44b726ADF1963cA47Af88B284C06f30380fC78',
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
    this.worker = new Worker('onchain-price', this.workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 60,
      concurrency: 25,
      metrics: {
        maxDataPoints: MetricsTime.TWO_WEEKS,
      },
    });
    this.logger.debug('info', '[initWorker:onchainPrice]', 'Worker initialized');
    this.initWorkerListeners(this.worker);
  }
  /**
   *  @description init BullMQ Queue
   */
  private initQueue() {
    this.queue = new Queue('onchain-price', {
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

    const queueEvents = new QueueEvents('onchain-price', {
      connection: this.redisConnection,
    });
    // TODO: ENABLE THIS
    this.initRepeatJobs();

    // queueEvents.on('completed', ({ jobId }) => {
    //   this.logger.debug('success', 'Job completed', { jobId });
    // });

    queueEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      this.logger.debug('error', 'onchainPrice:Job failed', jobId, failedReason);
    });
    // TODO: REMOVE THIS LATER
  }
  private initRepeatJobs() {
    this.queue.add(
      'add:update:transaction:usd-value',
      {},
      {
        repeatJobKey: 'add:update:transaction:usd-value',
        jobId: 'add:update:transaction:usd-value',
        repeat: {
          every: 1000 * 60 * 60,
        },
        removeOnComplete: true,
        removeOnFail: true,
        priority: 1,
        attempts: 5,
      },
    );
  }

  /**
   * Initialize Worker listeners
   * @private
   */
  private initWorkerListeners(worker: Worker) {
    // Completed
    worker.on('completed', ({ id, data, name }: Job<any>) => {
      this.logger.discord('success', '[job:onchainPrice:completed]', id, name, JSON.stringify(data));
    });
    // Failed
    worker.on('failed', ({ id, name, data, failedReason }: Job<any>, error: Error) => {
      this.logger.discord(
        'error',
        '[job:onchainPrice:error]',
        id,
        name,
        failedReason,
        JSON.stringify(data),
        JSON.stringify(error),
      );
    });
  }
  workerProcessor({ name, data }: Job<any>): Promise<void> {
    // this.logger.debug('info', `[onchainPrice:workerProcessor:run]`, { name, data });
    return this.jobs[name as keyof typeof this.jobs]?.call(this, data) || this.jobs.default();
  }
  async addUpdateUsdValueOfTransactionsJob() {
    const onchainPricePattern = 'bull:onchain-price:update:transaction:usd-value';
    const onchainPriceKeys = await queryRedisKeys(`${onchainPricePattern}:*`);
    const transactions = await this.mgClient
      .db('onchain')
      .collection('transaction')
      .find(
        {
          price: 0,
          hash: {
            $not: {
              $in: uniq([...onchainPriceKeys.map((key) => key.replace(`${onchainPricePattern}:`, ''))]),
            },
          },
        },
        {
          limit: 10000,
          sort: {
            timestamp: -1,
          },
        },
      )
      .toArray();
    const jobs = transactions.map((transaction) => {
      const { hash, token: token_address, symbol, timestamp, amount, chain_id, block } = transaction;
      return {
        name: 'update:transaction:usd-value',
        data: {
          hash,
          token_address,
          timestamp,
          amount,
          chain_id,
          block,
          symbol,
        },
        opts: {
          jobId: `update:transaction:usd-value:${hash}`,
          removeOnComplete: true,
          removeOnFail: false,
          priority: daysDiff(new Date(), new Date(timestamp * 1000)),
          attempts: 10,
        },
      };
    });
    await this.queue.addBulk(jobs);
    const discord = Container.get(DIDiscordClient);

    await discord.sendMsg({
      message:
        `\`\`\`diff` +
        `\n[onchain-price-addUpdateUsdValueOfTransactionsJob]` +
        `\n+ total_job: ${jobs.length}` +
        `\nstart on::${new Date().toISOString()}` +
        `\`\`\``,
      channelId: '1041620555188682793',
    });
  }
  async updateTransactionUsdValue({
    hash,
    chain_id,
    amount,
    block,
    timestamp,
    token_address,
  }: {
    hash: string;
    chain_id: number | 1 | 56;
    timestamp: number;
    amount: number;
    token_address: string;
    block: number;
  }) {
    const quoteTokens = (chain_id === 1 && QUOTE_TOKENS.ETH) || (chain_id === 56 && QUOTE_TOKENS.BNB);
    const chain = Object.values(PairBookChainIds).find((c) => c.chainId === chain_id);
    const token = await this.mgClient.db('onchain').collection('token').findOne({ address: token_address });
    if (!token) {
      this.logger.discord('error', '[updateTransactionUsdValue:token]', 'Token not found', token_address);
      throw new Error('Token not found');
    }
    if (!chain) {
      this.logger.discord('error', '[updateTransactionUsdValue:chain]', 'Chain not found', chain_id);
      throw new Error('Chain not found');
    }
    const pairs = await findPairsOfSymbol({
      'base_token.symbol': token.symbol,
      'quote_token.symbol': {
        $in: quoteTokens,
      },
      chain_id: chain.pairBookId,
    });
    const quoteToken = quoteTokens.find((q) => pairs.find((p) => p.quote_token.symbol === q));
    const pair = pairs.find((p) => p.quote_token.symbol === quoteToken);
    if (!pair) {
      this.logger.discord('error', '[updateTransactionUsdValue:pair]', 'Pair not found', token.symbol, quoteToken);
      throw new Error('Pair not found');
    }
    const { price, blockTimestampLast, reserve0, reserve1 } = await getPairPriceAtBlock({
      pairAddress: pair.address,
      blockNumber: block,
      chain: chain_id as any,
      decimals: token.decimals - QUOTE_TOKEN_DECIMALS[quoteToken][chain_id],
    });
    //update transaction price
    await this.mgClient
      .db('onchain')
      .collection('transaction')
      .updateOne(
        {
          hash,
        },
        {
          $set: {
            price,
            usd_value: amount * price,
            price_at: blockTimestampLast,
            updated_at: new Date(),
          },
        },
      );
    //log
    await this.mgClient
      .db('onchain-log')
      .collection('transaction-price-log')
      .insertOne({
        hash,
        input: {
          hash,
          chain_id,
          amount,
          block,
          timestamp,
          token_address,
        },
        output: {
          chain,
          price,
          usd_value: amount * price,
          price_at: blockTimestampLast,
        },
        var: {
          token,
          pairs,
          pair,
          reserve0,
          reserve1,
          blockTimestampLast,
          quoteToken,
          decimals: token.decimals - QUOTE_TOKEN_DECIMALS[quoteToken][chain_id],
        },
        updated_by: 'onchain-price',
        updated_at: new Date(),
      });
  }
}
