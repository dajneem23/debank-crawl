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
import { PairBookJob } from './pair-book.job';
export class PairBookService {
  private logger = new Logger('PairBookService');

  private readonly redisConnection = Container.get(DIRedisConnection);

  private worker: Worker;

  private queue: Queue;

  private mgClient: MongoClient = Container.get(DIMongoClient);

  private readonly jobs: {
    [key in PairBookJob | 'default']?: (data?: any) => Promise<void>;
  } = {
    'update:pair-book:symbol': this.updatePairsOfSymbol,
    'add:update:pair-book:symbol': this.addUpdatePairsOfSymbolJob,
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
    this.worker = new Worker('pair-book', this.workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 60,
      concurrency: 50,
      metrics: {
        maxDataPoints: MetricsTime.TWO_WEEKS,
      },
    });
    this.logger.debug('info', '[initWorker:pairBook]', 'Worker initialized');
    this.initWorkerListeners(this.worker);
  }
  /**
   *  @description init BullMQ Queue
   */
  private initQueue() {
    this.queue = new Queue('pair-book', {
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

    const queueEvents = new QueueEvents('pair-book', {
      connection: this.redisConnection,
    });
    // TODO: ENABLE THIS
    this.initRepeatJobs();

    // queueEvents.on('completed', ({ jobId }) => {
    //   this.logger.debug('success', 'Job completed', { jobId });
    // });

    queueEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      this.logger.debug('error', 'pairBook:Job failed', jobId, failedReason);
    });
    // TODO: REMOVE THIS LATER
  }
  private initRepeatJobs() {
    this.queue.add(
      'add:update:pair-book:symbol',
      {},
      {
        repeatJobKey: 'add:update:pair-book:symbol',
        jobId: 'add:update:pair-book:symbol',
        repeat: {
          every: 1000 * 60 * 60 * 12,
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
      this.logger.discord('success', '[job:pairBook:completed]', id, name, JSON.stringify(data));
    });
    // Failed
    worker.on('failed', ({ id, name, data, failedReason }: Job<any>, error: Error) => {
      this.logger.discord(
        'error',
        '[job:pairBook:error]',
        id,
        name,
        failedReason,
        JSON.stringify(data),
        JSON.stringify(error),
      );
    });
  }
  workerProcessor({ name, data }: Job<any>): Promise<void> {
    // this.logger.debug('info', `[pairBook:workerProcessor:run]`, { name, data });
    return this.jobs[name as keyof typeof this.jobs]?.call(this, data) || this.jobs.default();
  }
  async addUpdatePairsOfSymbolJob() {
    const tokens = await this.mgClient.db(getMgOnChainDbName()).collection('token').find({}).toArray();
    const jobs = tokens
      .map(({ symbol }) => symbol)
      .map((symbol) => ({
        name: 'update:pair-book:symbol',
        data: {
          symbol,
        },
        opts: {
          jobId: `update:pair-book:symbol:${symbol}`,
          removeOnComplete: true,
          removeOnFail: false,
          priority: 5,
        },
      }));
    this.queue.addBulk(jobs);
  }

  async updatePairsOfSymbol({ symbol }: { symbol: string }) {
    const { pairs } = await searchPairsFromDexScreener({
      q: symbol,
    });
    await Bluebird.map(
      pairs,
      async ({
        pairAddress: address,
        chainId: chain_id,
        dexId: dex_id,
        url,
        baseToken: base_token,
        quoteToken: quote_token,
        labels,
      }) => {
        const mgOnChainDb = this.mgClient.db(getMgOnChainDbName());
        const mgPairBookCollection = mgOnChainDb.collection('pair-book');
        await mgPairBookCollection.updateOne(
          {
            address,
          },
          {
            $set: {
              address,
              chain_id,
              url,
              base_token,
              quote_token,
              dex_id,
              symbols: [base_token.symbol, quote_token.symbol],
              addresses: [base_token.address, quote_token.address],
              updated_at: new Date(),
            },
            $push: {
              labels: {
                $addToSet: labels ?? [],
              },
            },
          },
          {
            upsert: true,
          },
        );
      },
      {
        concurrency: 20,
      },
    );
  }
}
