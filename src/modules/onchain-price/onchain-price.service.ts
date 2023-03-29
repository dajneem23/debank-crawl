import { DexScreenerAPI } from '../../common/api';
import { Logger } from '../../core/logger';
import { pgPoolToken } from '../../loaders/pg.loader';
import { DIRedisConnection } from '../../loaders/redis.loader';
import { Job, JobsOptions, MetricsTime, Queue, QueueEvents, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { env } from 'process';
import Container from 'typedi';
import { searchPairsFromDexScreener } from '../dexscreener/dexscreener.func';
import { MongoClient } from 'mongodb';
import { DIMongoClient } from '../../loaders/mongoDB.loader';
import { getMgOnChainDbName } from '../../common/db';
import Bluebird from 'bluebird';
import { findPairsOfSymbol } from '../pair-book/pair-book.func';
import { QUOTE_TOKENS, QUOTE_TOKEN_DECIMALS } from '../../service/ethers/quoteToken';
import { PairBookChainIds } from '../pair-book/pair-book.type';
import { find, uniq } from 'lodash';
import { getPairPriceAtBlock } from '../../service/ethers/price';
import { DIDiscordClient } from '../../loaders/discord.loader';
import { daysDiff } from '../../utils/date';
import { OnchainPriceJob } from './onchain-price.job';
import { getRedisKey, getRedisKeys, setExpireRedisKey, setRedisKey } from '../../service/redis/func';
import { workerProcessor } from './onchain-price.process';
export class OnChainPriceService {
  private logger = new Logger('OnChainPriceService');

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
    this.worker = new Worker('onchain-price', workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 60 * 3,
      skipLockRenewal: true,
      stalledInterval: 1000 * 30,
      concurrency: 10,
      metrics: {
        maxDataPoints: MetricsTime.TWO_WEEKS,
      },
    });
    this.logger.debug('info', '[initWorker:onchainPrice]', 'Worker initialized');
    // this.initWorkerListeners(this.worker);
    this.worker.on('completed', async (job) => {
      const discord = Container.get(DIDiscordClient);

      await discord.sendMsg({
        message: `:dollar:  onchain-price: ${job.id}`,
        channelId: '1041620555188682793',
      });
    });
    this.worker.on('failed', async (job, err) => {
      try {
        await this.mgClient
          .db('onchain-log')
          .collection('transaction-price-log')
          .insertOne({
            from: 'onchain-price',
            job: JSON.parse(JSON.stringify(job)),
            err: err.message,
          });
      } catch (error) {
        console.info({ error });
      }
    });
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
          every: 1000 * 60 * 15,
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
    // Failed

    worker.on('failed', async (job, err) => {
      try {
        this.logger.discord(
          'error',
          '[job:onchainPrice:error]',
          job?.id,
          job?.name,
          job?.failedReason,
          JSON.stringify(job?.data),
          JSON.stringify(err),
        );
        this.mgClient.db('onchain-log').collection('transaction-price-log').insertOne({
          job,
          from: 'defillama-onchain',
          err,
        });
      } catch (error) {
        console.info({ error });
      }
    });
  }
  async addUpdateUsdValueOfTransactionsJob() {
    const lastUpdate = +(await getRedisKey('onchain-price:last-update-transactions')) ?? 0;
    const limit = 20000;
    const transactions = (
      await this.mgClient
        .db('onchain')
        .collection('tx-event')
        .find({})
        .hint({ block_at: -1 })
        .sort({
          block_at: -1,
        })
        .limit(limit)
        .skip(lastUpdate * limit)
        .toArray()
    ).filter(({ usd_value }) => !usd_value);
    if (!transactions.length) {
      await setRedisKey('onchain-price:last-update-transactions', '0');
    } else {
      await setRedisKey('onchain-price:last-update-transactions', `${lastUpdate + 1}`);
    }
    const jobs = transactions.map((transaction) => {
      const { tx_hash, log_index, token, symbol, block_at, amount, chain_id, block_number } = transaction;
      return {
        name: 'update:transaction:usd-value',
        data: {
          tx_hash,
          log_index,
          token,
          timestamp: block_at,
          amount,
          chain_id,
          block_number,
          symbol,
        },
        opts: {
          jobId: `update:transaction:usd-value:${tx_hash}:${log_index}`,
          removeOnComplete: true,
          removeOnFail: {
            age: 60 * 30,
          },
          priority: daysDiff(new Date(), new Date(block_at * 1000)),
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

  async getTokenPrice({
    pairAddress,
    blockNumber,
    decimals,
    timestamp,
    token,
    chain,
    quoteToken,
    symbol,
  }: {
    pairAddress: string;
    blockNumber: number;
    token: string;
    chain: {
      chainId: number;
      chainName: string;
      defillamaId: string;
      pairBookId: string;
      alias: string[];
    };
    decimals: number;
    timestamp: number;
    quoteToken: string;
    symbol: string;
  }) {
    const tokenPrice = await this.mgClient
      .db('onchain')
      .collection('token-price')
      .findOne({
        timestamp: {
          $lte: timestamp + 1000 * 60,
          $gte: timestamp - 1000 * 60,
        },
        token_address: token,
      });
    if (tokenPrice) {
      return {
        price: tokenPrice.price,
        timestamp: tokenPrice.timestamp,
      };
    }

    const {
      price,
      timestamp: _timestamp,
      reserve0,
      reserve1,
      retryTime,
    } = await getPairPriceAtBlock({
      pairAddress: pairAddress,
      blockNumber: blockNumber,
      chain: chain.chainId as any,
      decimals: decimals - QUOTE_TOKEN_DECIMALS[quoteToken][chain.chainId],
      retry: 3,
    });
    await Promise.all([
      this.mgClient.db(getMgOnChainDbName()).collection('token-price').insertOne({
        price,
        updated_at: new Date(),
        timestamp: _timestamp,
        token_address: token,
        symbol,
        decimals,
        contract: {
          reserve0,
          reserve1,
          blockNumber,
          decimals,
        },
      }),
      setExpireRedisKey({
        key: `price:${symbol}`,
        expire: 60 * 5,
        value: `${timestamp}:${price}`,
      }),
    ]);

    return {
      price,
      timestamp: _timestamp,
      reserve0,
      reserve1,
      retryTime,
    };
  }
  async updateTransactionUsdValue({
    tx_hash,
    log_index,
    chain_id,
    amount,
    block_number,
    timestamp,
    token,
  }: {
    tx_hash: string;
    log_index: number;
    chain_id: number | 1 | 56;
    timestamp: number;
    amount: number;
    token: string;
    block_number: number;
  }) {
    const quoteTokens = (chain_id === 1 && QUOTE_TOKENS.ETH) || (chain_id === 56 && QUOTE_TOKENS.BNB);
    const chain = Object.values(PairBookChainIds).find((c) => c.chainId === chain_id);
    const _token = await this.mgClient.db('onchain').collection('token').findOne({ address: token });
    if (!_token) {
      this.logger.discord('error', '[updateTransactionUsdValue:token]', 'Token not found', token);
      throw new Error('Token not found');
    }
    if (!_token.decimals) {
      this.logger.discord('error', '[updateTransactionUsdValue:token]', 'Token decimals not found', token);
      throw new Error('Token decimals not found');
    }
    if (!chain) {
      this.logger.discord('error', '[updateTransactionUsdValue:chain]', 'Chain not found', chain_id);
      throw new Error('Chain not found');
    }
    const pairs = await findPairsOfSymbol({
      $or: [
        {
          'base_token.symbol': _token.symbol,
          'quote_token.symbol': {
            $in: quoteTokens,
          },
        },
        {
          'base_token.symbol': {
            $in: quoteTokens,
          },
          'quote_token.symbol': _token.symbol,
        },
      ],
      chain_id: chain.pairBookId,
    });
    //find first quote token that has pair
    const quoteToken = quoteTokens.find((q) => pairs.find((p) => p.quote_token.symbol === q));
    //use quote token to get pair
    const pair = pairs.find((p) => p.quote_token.symbol === quoteToken);
    if (!pair) {
      this.logger.discord('error', '[updateTransactionUsdValue:pair]', 'Pair not found', _token.symbol, quoteToken);
      throw new Error('Pair not found');
    }
    const {
      price,
      timestamp: _timestamp,
      reserve0,
      reserve1,
      retryTime,
    } = await this.getTokenPrice({
      pairAddress: pair.address,
      blockNumber: block_number,
      token,
      chain,
      decimals: _token.decimals,
      timestamp,
      quoteToken,
      symbol: _token.symbol,
    });
    //update transaction price
    await this.mgClient
      .db('onchain')
      .collection('tx-event')
      .updateMany(
        {
          block_at: timestamp,
          tx_hash,
          log_index,
        },
        {
          $set: {
            price,
            usd_value: amount * price,
            price_at: _timestamp,
            updated_at: new Date(),
          },
        },
      );
    //log
    // await this.mgClient
    //   .db('onchain-log')
    //   .collection('transaction-price-log')
    //   .insertOne({
    //     tx_hash,
    //     input: {
    //       tx_hash,
    //       log_index,
    //       chain_id,
    //       amount,
    //       block_number,
    //       timestamp,
    //       token,
    //     },
    //     output: {
    //       chain,
    //       price,
    //       usd_value: amount * price,
    //       price_at: _timestamp,
    //     },
    //     var: {
    //       token,
    //       pairs,
    //       pair,
    //       reserve0,
    //       reserve1,
    //       retryTime,
    //       _timestamp,
    //       quoteToken,
    //       decimals: _token.decimals - QUOTE_TOKEN_DECIMALS[quoteToken][chain_id],
    //     },
    //     updated_by: 'onchain-price',
    //     updated_at: new Date(),
    //   });
  }
}
