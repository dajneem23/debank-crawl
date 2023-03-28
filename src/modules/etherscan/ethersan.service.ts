import { Logger } from '../../core/logger';
import { EtherscanJobNames, callEtherScanAPI, checkEtherscanResponse } from './etherscan.fnc';
import { Db, MongoClient } from 'mongodb';
import { env } from 'process';
import Bluebird from 'bluebird';
import { Job, MetricsTime, Queue, Worker } from 'bullmq';
import Container from 'typedi';
import { DIRedisConnection } from '../../loaders/redis.loader';
import { DIDiscordClient } from '../../loaders/discord.loader';
import { initQueue, initQueueListeners } from '../../utils/bullmq';

const API_KEYS = process.env.ETHERSCAN_API_KEYS.split(',');

export class EtherScanService {
  dbClient: MongoClient;

  db: Db;

  worker: Worker;

  queue: Queue;

  private readonly redisConnection = Container.get(DIRedisConnection);

  private readonly jobs: {
    [key in EtherscanJobNames | 'default']?: (payload?: any) => any;
  } = {
    'etherscan:transaction:normal:by-address': this.crawlNormalTransactionsByAddress,
    default: () => {
      throw new Error('Invalid job name');
    },
  };

  constructor() {
    this.initMongoDB();

    if (env.MODE === 'production') {
      // Init Worker
      this.initWorker();
      // Init Queue
      this.initQueue();
    }
  }

  private logger = new Logger('EtherScanService');

  api_keys = API_KEYS.map((key) => ({
    key,
  }));

  get apiKey() {
    //get random api key
    return this.api_keys[Math.floor(Math.random() * this.api_keys.length)];
  }

  async initMongoDB() {
    this.dbClient = await MongoClient.connect(env.MONGO_URI);
    this.dbClient.on('disconnected', () => this.logger.warn('disconnected', 'MongoDB coingecko disconnected'));
    this.dbClient.on('reconnected', () => this.logger.success('reconnected', 'MongoDB coingecko disconnected'));
    this.db = this.dbClient.db('onchain');
    this.logger.success('connected', 'CoinGeckoService:MongoDB');
  }

  initWorker() {
    this.worker = new Worker('etherscan', this.workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 60 * 5,
      concurrency: 10,
      limiter: {
        max: 10,
        duration: 1000,
      },
      stalledInterval: 1000 * 60,
      maxStalledCount: 20,
      metrics: {
        maxDataPoints: MetricsTime.ONE_WEEK,
      },
    });
    this.initWorkerListeners(this.worker);
  }

  /**
   * Initialize Worker listeners
   * @private
   */
  private initWorkerListeners(worker: Worker) {
    worker.on('failed', ({ id, name, data, failedReason }: Job<any>, error: Error) => {
      this.logger.discord(
        'error',
        '[job:etherscan:error]',
        id,
        name,
        failedReason,
        JSON.stringify(data),
        JSON.stringify(error),
      );
    });
    worker.on('drained', async () => {
      const etherscanJobs = await this.queue.getJobCounts();
      // console.info('workerDrained');
      const discord = Container.get(DIDiscordClient);

      const notFinishedJobs = [etherscanJobs];
      const totalNotFinishedJobs = notFinishedJobs.reduce((acc, cur) => {
        return acc + cur.waiting + cur.active + cur.delayed;
      }, 0);

      const messageByRow =
        `\`\`\`diff` +
        `\n 🔴 etherscan:` +
        `\n+ ${etherscanJobs.waiting} waiting` +
        `\n+ ${etherscanJobs.active} active` +
        `\n+ ${etherscanJobs.delayed} delayed` +
        `\n+ ${etherscanJobs.completed} completed` +
        `\n- ${etherscanJobs.failed} failed` +
        `\n⏩ is running: ${this.worker.isRunning()}` +
        `\n⏸️ is pause: ${await this.queue.isPaused()}` +
        `\n⏯️ next_Job: ${(await this.worker.getNextJob('etherscan'))?.id}` +
        `\ntotal not finished jobs: ${totalNotFinishedJobs}` +
        `\ntime: ${new Date().toISOString()}` +
        `\`\`\``;
      await discord.sendMsg({
        message: messageByRow,
        channelId: '1072390401392115804',
      });
    });
  }

  initQueue() {
    this.queue = initQueue({
      queueName: 'etherscan',
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
    initQueueListeners({ queueName: 'etherscan', opts: { connection: this.redisConnection } });
  }

  workerProcessor({ name, data = {}, id }: Job<any>): Promise<void> {
    return (
      this.jobs[name as keyof typeof this.jobs]?.call(this, {
        jobId: id,
        ...((data && data) || {}),
      }) || this.jobs.default()
    );
  }

  async test() {
    await this.crawlNormalTransactionsByAddress({
      address: '0x41318419cfa25396b47a94896ffa2c77c6434040',
      offset: 10000,
      sort: 'asc',
    });
  }
  //TODO: CRON JOB
  async crawlNormalTransactionsByAddress({
    address,
    startblock = '0',
    endblock = '99999999',
    offset = 10000,
    sort = 'asc',
  }: {
    address: string;
    startblock?: string;
    endblock?: string;
    offset?: number;
    sort?: 'asc' | 'desc';
  }) {
    try {
      const { key } = this.apiKey;
      // let page = 0;
      const { status, message, result } = await callEtherScanAPI({
        address,
        module: 'account',
        action: 'txlist',
        startblock,
        endblock,
        page: 0,
        offset,
        sort,
        apikey: key,
      });
      checkEtherscanResponse({ status, message, result });

      await this.db.collection('etherscan-normal-transaction-by-address').findOneAndUpdate(
        {
          address,
        },
        {
          $set: {
            transactions: result,
            updated_at: new Date(),
            transaction_count: result.length,
            start_block: result[0].blockNumber,
            end_block: result[result.length - 1].blockNumber,
          },
          $setOnInsert: {
            address,
            created_at: new Date(),
          },
        },
        {
          upsert: true,
        },
      );
      // return { status, message, result };
    } catch (error) {
      if (error.message === 'RATE_LIMIT') {
        this.logger.discord('error', 'crawlTransactions:->RATE_LIMIT', error);
      }
      this.logger.error('error', 'crawlTransactions', error);
      throw error;
    }
  }
}
