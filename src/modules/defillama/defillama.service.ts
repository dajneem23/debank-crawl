import Container from 'typedi';
import { Job, JobsOptions, MetricsTime, Queue, QueueEvents, Worker } from 'bullmq';
import { env } from 'process';
import { DIRedisConnection } from '../../loaders/redis.loader';

import { DefillamaJobData, DefillamaJobNames } from './defillama.job';

import { getCoinsCurrentPrice, getCoinsHistorical } from './defillama.func';
import { MongoClient } from 'mongodb';
import { DIMongoClient } from '../../loaders/mongoDB.loader';
import { createArrayDateByHours, daysDiff } from '../../utils/date';
import { getMgOnChainDbName } from '../../common/db';
import { DIDiscordClient } from '../../loaders/discord.loader';
import Bluebird from 'bluebird';
import { chunk } from 'lodash';
import { CHAINS } from '../../types/chain';
import { getRedisKey, setExpireRedisKey, setRedisKey } from '../../service/redis/func';
import { workerProcessor } from './defiilama.process';
import { getAllTokenOnRedis, getTokenOnRedis } from '../../service/token/func';
import { Logger } from '../../core/logger';
import { sendTelegramMessage } from '../../service/alert/telegram';

export class DefillamaService {
  private logger = new Logger('Defillama');

  private readonly redisConnection = Container.get(DIRedisConnection);

  private worker: Worker;

  private workerOnchain: Worker;

  private workerToken: Worker;

  private workerPool: Worker;

  private workerPrice: Worker;

  private queue: Queue;

  private queueOnchain: Queue;

  private queueToken: Queue;

  private queuePool: Queue;

  private queuePrice: Queue;

  private mgClient: MongoClient = Container.get(DIMongoClient);

  private readonly jobs: {
    [key in DefillamaJobNames | 'default']?: (params?: any) => Promise<void>;
  } = {
    'defillama:fetch:coin:historical:data:id:timestamp': this.fetchCoinsHistoricalData,
    'defillama:add:fetch:coin:historical': this.addFetchCoinsHistoricalDataJob,
    'defillama:update:usd:value:of:transaction': this.updateUsdValueOfTransaction,
    'defillama:add:update:usd:value:of:transaction': this.addUpdateUsdValueOfTransactionsJob,
    'defillama:update:pool:of:transaction': this.updatePoolOfTransaction,
    'defillama:add:pool:of:transaction': this.addUpdatePoolOfTransactionsJob,
    'defillama:update:coins:current:price': this.updateCoinsCurrentPrice,
    'defillama:add:update:coins:current:price': this.addUpdateCoinsCurrentPriceJob,
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
    this.worker = new Worker('defillama', workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 60 * 2,
      concurrency: 10,
      stalledInterval: 1000 * 15,
      skipLockRenewal: true,
      maxStalledCount: 1,
      metrics: {
        maxDataPoints: MetricsTime.TWO_WEEKS,
      },
    });
    this.initWorkerListeners(this.worker);

    this.workerOnchain = new Worker('defillama-onchain', workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 30,
      skipLockRenewal: true,
      stalledInterval: 1000 * 15,
      concurrency: 500,
      maxStalledCount: 5,
      metrics: {
        maxDataPoints: MetricsTime.TWO_WEEKS,
      },
    });

    // this.workerOnchain.on('completed', async (job) => {
    //   const discord = Container.get(DIDiscordClient);

    //   await discord.sendMsg({
    //     message: `Onchain job completed: ${job.id}`,
    //     channelId: '1041620555188682793',
    //   });
    // });

    this.workerOnchain.on('failed', async (job, err) => {
      try {
        await this.mgClient
          .db('onchain-log')
          .collection('transaction-price-log')
          .insertOne({
            from: 'defillama-onchain',
            job: JSON.parse(JSON.stringify(job)),
            err: err.message,
          });
      } catch (error) {
        console.info({ error });
      }
    });

    this.workerToken = new Worker('defillama-token', workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 30,
      stalledInterval: 1000 * 15,
      skipLockRenewal: true,
      concurrency: 25,
      maxStalledCount: 5,
      metrics: {
        maxDataPoints: MetricsTime.TWO_WEEKS,
      },
    });
    this.initWorkerListeners(this.workerToken);

    this.workerPool = new Worker('defillama-pool', workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 60,
      skipLockRenewal: true,
      concurrency: 20,
      maxStalledCount: 5,
      metrics: {
        maxDataPoints: MetricsTime.TWO_WEEKS,
      },
    });
    this.initWorkerListeners(this.workerPool);

    this.workerPrice = new Worker('defillama-price', workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 60,
      skipLockRenewal: true,
      concurrency: 20,
      maxStalledCount: 5,
      metrics: {
        maxDataPoints: MetricsTime.TWO_WEEKS,
      },
    });
    this.initWorkerListeners(this.workerPrice);
    this.logger.debug('info', '[initWorker:defillama]', 'Worker initialized');
  }
  /**
   *  @description init BullMQ Queue
   */
  private initQueue() {
    this.queue = new Queue('defillama', {
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

    const queueEvents = new QueueEvents('defillama', {
      connection: this.redisConnection,
    });

    queueEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      this.logger.debug('error', ':defillamaJob failed', { jobId, failedReason });
    });

    this.queueOnchain = new Queue('defillama-onchain', {
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
    const queueOnchainEvents = new QueueEvents('defillama-onchain', {
      connection: this.redisConnection,
    });

    queueOnchainEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      this.logger.debug('error', ':defillamaJob failed', { jobId, failedReason });
    });
    queueOnchainEvents.on('added', async ({ jobId }: { jobId: string }) => {
      const countJobs = await this.queueOnchain.getJobCounts();
      if (countJobs.waiting > 250000) {
        await sendTelegramMessage({
          message: `Defillama-Onchain queue is getting too big: ${countJobs.waiting}`,
        });
      }
    });

    this.queueToken = new Queue('defillama-token', {
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
    const queueTokenEvents = new QueueEvents('defillama-token', {
      connection: this.redisConnection,
    });

    queueTokenEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      this.logger.debug('error', ':defillamaJob failed', { jobId, failedReason });
    });

    this.queuePool = new Queue('defillama-pool', {
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
    const queuePoolEvents = new QueueEvents('defillama-pool', {
      connection: this.redisConnection,
    });

    queuePoolEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      this.logger.debug('error', ':defillamaJob failed', { jobId, failedReason });
    });

    this.queuePrice = new Queue('defillama-price', {
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
    const queuePriceEvents = new QueueEvents('defillama-price', {
      connection: this.redisConnection,
    });

    queuePriceEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      this.logger.debug('error', ':defillamaJob failed', { jobId, failedReason });
    });
    this.initRepeatJobs();

    // this.addUpdateUsdValueOfTransactionsJob();
    // TODO: REMOVE THIS LATER
    // this.addFetchTVLProtocolTVLJob();
    // this.queue.getJobCounts().then((res) => console.log(res));
  }
  private initRepeatJobs() {
    this.queue.add(
      'defillama:add:update:usd:value:of:transaction',
      {},
      {
        repeatJobKey: 'defillama:add:update:usd:value:of:transaction',
        jobId: 'defillama:add:update:usd:value:of:transaction',
        repeat: {
          every: 1000 * 60 * 15,
        },
        removeOnComplete: true,
        removeOnFail: false,
        priority: 1,
        attempts: 5,
      },
    );
    this.queue.add(
      'defillama:add:update:coins:current:price',
      {},
      {
        repeatJobKey: 'defillama:add:update:coins:current:price',
        jobId: 'defillama:add:update:coins:current:price',
        repeat: {
          every: 1000 * 60 * 2.5,
        },
        removeOnComplete: true,
        removeOnFail: false,
        priority: 1,
        attempts: 5,
      },
    );
  }
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
      removeOnComplete: true,
    },
  }: {
    name: DefillamaJobNames;
    payload?: any;
    options?: JobsOptions;
  }) {
    this.queue.add(name, payload, options);
  }
  /**
   * Initialize Worker listeners
   * @private
   */
  private initWorkerListeners(worker: Worker) {
    worker.on('failed', ({ id, name, data, failedReason }: Job<DefillamaJobData>, error: Error) => {
      this.logger.discord(
        'error',
        '[job:defillama:error]',
        id,
        name,
        failedReason,
        JSON.stringify(data),
        JSON.stringify(error),
      );
    });
  }

  async fetchCoinsHistoricalData({
    id,
    timestamp,
    symbol,
    token,
  }: {
    id: string;
    timestamp: number;
    symbol: string;
    token: string;
  }) {
    try {
      await this.getCoinsHistoricalData({
        id,
        timestamp,
        token,
      });
    } catch (error) {
      this.logger.discord('error', '[fetchCoinsHistoricalData:error]', JSON.stringify(error));
      throw error;
    }
  }

  async getCoinsHistoricalData({ id, timestamp, token }: { id: string; timestamp: number; token: string }) {
    const tokenPriceFromRedis = await getRedisKey(`price:${id.replace('coingecko:', '')}`);
    if (tokenPriceFromRedis) {
      const [_timestamp, price] = tokenPriceFromRedis.split(':');
      if (_timestamp && price && +_timestamp > timestamp - 1000 * 2 * 60 && +_timestamp < timestamp + 1000 * 2 * 60) {
        return {
          price: +price,
          timestamp: +_timestamp,
        };
      }
    }
    const exists = await this.mgClient
      .db(getMgOnChainDbName())
      .collection('token-price')
      .findOne({
        timestamp: {
          $lte: timestamp + 1000 * 2 * 60,
          $gte: timestamp - 1000 * 2 * 60,
        },
        $or: [{ id }, { token_address: token }],
      });
    if (exists && exists.price) {
      return exists;
    }
    const { coins } = await getCoinsHistorical({
      coins: `${id}`,
      timestamp,
    });
    if (!coins[id] || !coins[id].price) {
      this.logger.discord(
        'error',
        '[fetchCoinsHistoricalData:error]',
        JSON.stringify({
          req: {
            id,
            timestamp,
          },
          res: coins,
        }),
      );
      throw new Error('fetchCoinsHistoricalData: Invalid response');
    }
    const { price, timestamp: _timestamp, decimals, symbol } = coins[id];
    await this.mgClient
      .db(getMgOnChainDbName())
      .collection('token-price')
      .insertOne({
        price,
        updated_at: new Date(),
        timestamp: _timestamp,
        id,
        token_id: id.replace('coingecko:', ''),
        symbol,
        token_address: token,
      });
    return {
      price,
      timestamp: _timestamp,
      decimals,
      symbol,
      id,
    };
  }

  async addFetchCoinsHistoricalDataJob() {
    const tokens = await this.mgClient
      .db('onchain')
      .collection('token')
      .find({
        coingeckoId: {
          $exists: true,
          $ne: null,
        },
      })
      .toArray();

    const maxTimestamp = await this.mgClient
      .db('onchain')
      .collection('token-price')
      .find({})
      .sort({
        timestamp: -1,
      })
      .limit(1)
      .toArray();
    const start = maxTimestamp[0]?.timestamp
      ? new Date(
          new Date(maxTimestamp[0].timestamp * 1000).getFullYear(),
          new Date(maxTimestamp[0].timestamp * 1000).getMonth(),
          new Date(maxTimestamp[0].timestamp * 1000).getDate(),
          new Date(maxTimestamp[0].timestamp * 1000).getHours(),
        )
      : new Date('2023-01-01');

    const jobs = await Promise.all(
      tokens
        .map((token) => {
          const { coingeckoId, symbol, chain_id, address } = token;
          const dates = createArrayDateByHours({
            start,
            end: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), new Date().getHours()),
            range: 0.02,
            timestamp: true,
          });
          return dates.map((timestamp) => {
            return {
              name: 'defillama:fetch:coin:historical:data:id:timestamp',
              data: {
                id: coingeckoId ? `coingecko:${coingeckoId}` : `ethereum:${chain_id}:${address}`,
                symbol,
                timestamp,
                token: address,
              },
              opts: {
                jobId: `defillama:fetch:coin:historical:data:id:timestamp:${coingeckoId}:${timestamp}`,
                removeOnComplete: true,
                removeOnFail: false,
                attempts: 10,
              },
            };
          });
        })
        .flat(),
    );
    await this.queueToken.addBulk(jobs);

    const discord = Container.get(DIDiscordClient);

    await discord.sendMsg({
      message:
        `\`\`\`diff` +
        `\n[DEFILLAMA-addFetchCoinsHistoricalDataJob]` +
        `\n+ total_job: ${jobs.length}` +
        `\nstart on::${new Date().toISOString()}` +
        `\`\`\``,
      channelId: '1041620555188682793',
    });
  }

  async addUpdateUsdValueOfTransactionsJob() {
    const lastUpdate = +(await getRedisKey('defillama-onchain:last-update-transactions')) ?? 0;
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
    ).filter(({ price }) => !price);

    const jobs = transactions.map((transaction) => {
      const { tx_hash, token: token, symbol, block_at, amount, chain_id, block_number, log_index } = transaction;
      return {
        name: 'defillama:update:usd:value:of:transaction',
        data: {
          log_index,
          tx_hash,
          token,
          timestamp: block_at,
          amount,
          chain_id,
          block_number,
          symbol,
        },
        opts: {
          jobId: `defillama:update:usd:value:of:transaction:${tx_hash}:${log_index}`,
          removeOnComplete: true,
          removeOnFail: {
            age: 60 * 5,
          },
          priority: daysDiff(new Date(), new Date(block_at * 1000)),
          attempts: 10,
        },
      };
    });
    await this.queueOnchain.addBulk(jobs);

    if (!transactions.length || transactions.length < limit) {
      await setRedisKey('defillama-onchain:last-update-transactions', '0');
    } else {
      await setRedisKey('defillama-onchain:last-update-transactions', `${lastUpdate + 1}`);
    }
    const discord = Container.get(DIDiscordClient);

    await discord.sendMsg({
      message:
        `\`\`\`diff` +
        `\n[DEFILLAMA-addUpdateUsdValueOfTransactionsJob]` +
        `\n+ total_job: ${jobs.length}` +
        `\nstart on::${new Date().toISOString()}` +
        `\`\`\``,
      channelId: '1041620555188682793',
    });
  }

  async updateUsdValueOfTransaction({
    tx_hash,
    log_index,
    token,
    timestamp,
    amount,
    chain_id,
    block_number,
    symbol,
  }: {
    tx_hash: string;
    token: string;
    timestamp: number;
    amount: number;
    chain_id: number;
    block_number: number;
    symbol: string;
    log_index: number;
  }) {
    try {
      const chain = Object.values(CHAINS).find((chain) => chain.id === chain_id);
      if (!chain) {
        this.logger.discord(
          'error',
          '[updateUsdValueOfTransaction:chain:error]',
          JSON.stringify({
            req: {
              tx_hash,
              token,
              timestamp,
              amount,
              chain_id,
            },
            res: chain,
          }),
        );
        throw new Error('updateUsdValueOfTransaction: Invalid chain');
      }
      const _token =
        (await getTokenOnRedis({
          chainId: chain_id,
          address: token,
        })) ??
        (await this.mgClient.db('onchain').collection('token').findOne({
          address: token,
        }));
      if (!_token || !_token.coingeckoId) {
        this.logger.discord(
          'error',
          '[updateUsdValueOfTransaction:token:error]',
          JSON.stringify({
            req: {
              tx_hash,
              token,
              timestamp,
              amount,
              chain_id,
            },
            res: token,
          }),
        );
        throw new Error('updateUsdValueOfTransaction: Invalid token');
      }
      const { price, timestamp: _timestamp } = await this.getCoinsHistoricalData({
        id: `coingecko:${_token.coingeckoId}`,
        token,
        timestamp,
      });
      await this.mgClient
        .db('onchain')
        .collection('tx-event')
        .updateMany(
          {
            block_at: timestamp,
            log_index,
            tx_hash,
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
    } catch (error) {
      this.logger.discord(
        'error',
        '[updateUsdValueOfTransaction:error]',
        JSON.stringify({
          req: {
            tx_hash,
            token,
            timestamp,
            amount,
            chain_id,
          },
          res: error,
        }),
      );
      throw error;
    }
  }

  async addUpdatePoolOfTransactionsJob() {
    const transactions = await this.mgClient
      .db('onchain')
      .collection('tx-event')
      .find(
        {},
        {
          limit: 25000,
        },
      )
      .toArray();
    const jobs = transactions.map((transaction) => {
      const { tx_hash, log_index, from, to } = transaction;
      return {
        name: 'defillama:update:pool:of:transaction',
        data: {
          tx_hash,
          log_index,
          from,
          to,
        },
        opts: {
          jobId: `defillama:update:pool:of:transaction:${tx_hash}`,
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 10,
        },
      };
    });
    await this.queuePool.addBulk(jobs);

    const discord = Container.get(DIDiscordClient);

    await discord.sendMsg({
      message:
        `\`\`\`diff` +
        `\n[DEFILLAMA-addUpdatePoolOfTransactionsJob]` +
        `\n+ total_job: ${jobs.length}` +
        `\nstart on::${new Date().toISOString()}` +
        `\`\`\``,
      channelId: '1041620555188682793',
    });
  }

  async updatePoolOfTransaction({
    from,
    to,
    tx_hash,
    log_index,
  }: {
    tx_hash: string;
    from: string;
    to: string;
    log_index: number;
  }) {
    const pools = await this.mgClient
      .db('onchain')
      .collection('pool-book')
      .find({
        pool_id: {
          $in: [from, to],
        },
      })
      .toArray();
    if (pools && pools.length > 0) {
      await this.mgClient
        .db(getMgOnChainDbName())
        .collection('tx-event')
        .findOneAndUpdate(
          {
            tx_hash,
            log_index,
          },
          {
            $set: {
              updated_at: new Date(),
            },
            $push: {
              pools: {
                $each: pools.map(({ pool_id: id, details: { name }, protocol_id, chain }) => ({
                  id,
                  name,
                  protocol_id,
                  chain,
                })),
              },
            } as any,
          },
        );
    }
    await this.mgClient
      .db(getMgOnChainDbName())
      .collection('transaction-pool-log')
      .insertOne({
        tx_hash,
        log_index,
        updated_at: new Date(),
        pools: pools.map(({ pool_id: id, details: { name }, protocol_id, chain }) => ({
          id,
          name,
          protocol_id,
          chain,
        })),
      });
  }

  async addUpdateCoinsCurrentPriceJob() {
    const { tokens } = await getAllTokenOnRedis();
    const list_coins = chunk(
      tokens.filter(({ coingeckoId }) => coingeckoId),
      20,
    );
    const jobs = list_coins.map((coin) => {
      return {
        name: 'defillama:update:coins:current:price',
        data: {
          coins: coin.map(({ address, coingeckoId }) => `coingecko:${coingeckoId}`).join(','),
        },
        opts: {
          removeOnComplete: {
            age: 60 * 2.5,
          },
          removeOnFail: {
            age: 60 * 2.5,
          },
          priority: 1,
        },
      };
    });
    await this.queuePrice.addBulk(jobs);
    const discord = Container.get(DIDiscordClient);

    await discord.sendMsg({
      message:
        `\`\`\`diff` +
        `\n[DEFILLAMA-addUpdateCoinsCurrentPriceJob]` +
        `\n+ total_job: ${jobs.length}` +
        `\nstart on::${new Date().toISOString()}` +
        `\`\`\``,
      channelId: '1041620555188682793',
    });
  }
  async updateCoinsCurrentPrice({ coins }) {
    const prices = await getCoinsCurrentPrice({
      coins,
    });
    const data = Object.entries(prices.coins).map(([id, { price, symbol, confidence, timestamp }]: [string, any]) => {
      return {
        id,
        token_id: id.replace('coingecko:', ''),
        price,
        symbol,
        confidence,
        timestamp,
        updated_at: new Date(),
        updated_by: 'defillama',
      };
    });

    data.length &&
      (await Promise.all([
        Bluebird.map(
          data,
          async (item) => {
            const { id, timestamp, price, symbol, updated_at, confidence } = item;
            await setExpireRedisKey({
              key: `price:${id.replace('coingecko:', '')}`,
              expire: 60 * 5,
              value: `${timestamp}:${price}`,
            });
          },
          {
            concurrency: 50,
          },
        ),
        this.mgClient.db('onchain').collection('token-price').insertMany(data),
      ]));
  }
}
