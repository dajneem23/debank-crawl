import Container from 'typedi';
import Logger from '@/core/logger';
import { Job, JobsOptions, MetricsTime, Queue, QueueEvents, Worker } from 'bullmq';
import { env } from 'process';
import { DIRedisConnection } from '@/loaders/redisClientLoader';

import { sleep } from '@/utils/common';
import Binance from 'node-binance-api';
import { BinanceJobData, BinanceJobNames } from './binance.job';
import { INTERVALS, LISTEN_SYMBOLS } from './binance.const';
import { CandleTick, chartResponse } from './binance.type';
import { Db, MongoClient } from 'mongodb';
import { Group3Alphabet } from '@/utils/text';
export class BinanceService {
  private logger = new Logger('Binance');

  private readonly redisConnection = Container.get(DIRedisConnection);

  dbClient: MongoClient;
  db: Db;

  private worker: Worker;

  private queue: Queue;

  private binance: Binance = new Binance().options({
    APIKEY: env.BINANCE_API_KEY,
    APISECRET: env.BINANCE_API_SECRET,
    useServerTime: true,
    recvWindow: 60000,
    batchOrders: 20,
    reconnect: true, // set to true to reconnect automatically when connection is lost
    verbose: true,
    log: this.logger.in.bind(this),
  });

  // private queueScheduler: QueueScheduler;

  private readonly jobs: {
    [key in BinanceJobNames | 'default']?: (payload?: any) => Promise<void>;
  } = {
    'binance:insert:candlestick': this.insertCandlesticksByFirstLetter,
    default: () => {
      throw new Error('Invalid job name');
    },
  };

  constructor() {
    // this.binance.futuresPrices().then((res: any) => console.log({ res }));
    MongoClient.connect(env.MONGO_URI_BINANCE).then((client) => {
      this.dbClient = client;
      this.logger.success('connected', 'MongoDB');
      this.db = client.db();
      client.on('disconnected', () => this.logger.warn('disconnected', 'MongoDB binance disconnected'));
      client.on('reconnected', () => this.logger.success('reconnected', 'MongoDB binance disconnected'));
      // TODO: CHANGE THIS TO PRODUCTION
      if (env.MODE === 'production') {
        // Init Worker
        this.initWorker();
        // Init Queue
        this.initQueue();

        this.listenCandlesticks({
          symbols: LISTEN_SYMBOLS,
          interval: '1m',
        });
      }
    });
  }

  /**
   *  @description init BullMQ Worker
   */
  private initWorker() {
    this.worker = new Worker('binance', this.workerProcessor.bind(this), {
      autorun: true,
      connection: this.redisConnection,
      lockDuration: 1000 * 60,
      concurrency: 10,
      limiter: {
        max: 50,
        duration: 60 * 1000,
      },
      metrics: {
        maxDataPoints: MetricsTime.ONE_WEEK,
      },
    });
    this.logger.debug('info', '[initWorker:binance]', 'Worker initialized');
    this.initWorkerListeners(this.worker);
  }
  /**
   *  @description init BullMQ Queue
   */
  private initQueue() {
    this.queue = new Queue('binance', {
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
    // this.queueScheduler = new QueueScheduler('binance', {
    //   connection: this.redisConnection,
    // });
    const queueEvents = new QueueEvents('binance', {
      connection: this.redisConnection,
    });
    // TODO: ENABLE THIS
    // this.initRepeatJobs();

    // queueEvents.on('completed', ({ jobId }) => {
    //   this.logger.debug('success', 'Job completed', { jobId });
    // });

    queueEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      this.logger.discord('error', 'binance:Job failed', jobId, failedReason);
    });
    // TODO: REMOVE THIS LATER
    // this.addFetchProjectUsersJobs();
  }
  // private initRepeatJobs() {}
  /**
   * @description add job to queue
   */
  addJob({ name, payload = {}, options }: { name: BinanceJobNames; payload?: any; options?: JobsOptions }) {
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
    worker.on('completed', ({ id, data, name }: Job<BinanceJobData>) => {
      this.logger.discord('success', '[job:binance:completed]', id, name, JSON.stringify(data));
    });
    // Failed
    worker.on('failed', ({ id, name, data, failedReason }: Job<BinanceJobData>, error: Error) => {
      this.logger.discord(
        'error',
        '[job:binance:error]',
        id,
        name,
        failedReason,
        JSON.stringify(data),
        JSON.stringify(error),
      );
    });
  }
  workerProcessor({ name, data }: Job<BinanceJobData>): Promise<void> {
    // this.logger.discord('info', `[binance:workerProcessor:run]`, name);
    return this.jobs[name as keyof typeof this.jobs]?.call(this, data) || this.jobs.default();
  }
  candlesticksHandler = async (
    // interval: keyof typeof INTERVALS,
    // chart: chartResponse,
    candlesticks: CandleTick,
  ) => {
    const { e: eventType, E: eventTime, s: symbol, k: ticks } = candlesticks;
    const {
      o: open,
      h: high,
      l: low,
      c: close,
      v: volume,
      n: trades,
      i: interval,
      x: isFinal,
      q: quoteVolume,
      V: buyVolume,
      Q: quoteBuyVolume,
      T: timeStamp,
    } = ticks;
    //* Check if candlestick is final
    if (isFinal) {
      this.addJob({
        name: 'binance:insert:candlestick',
        payload: {
          symbol,
          interval,
          open,
          high,
          low,
          close,
          volume,
          trades,
          quoteVolume,
          buyVolume,
          quoteBuyVolume,
          timeStamp,
        },
        options: {
          removeOnComplete: {
            age: 1000 * 60 * 60 * 24 * 7,
          },
          removeOnFail: {
            age: 1000 * 60 * 60 * 24 * 7,
          },
        },
      });
    }
  };
  async insertCandlesticksByFirstLetter({
    symbol,
    interval,
    open,
    high,
    low,
    close,
    volume,
    trades,
    quoteVolume,
    buyVolume,
    quoteBuyVolume,
    timeStamp,
  }: {
    symbol: string;
    interval: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    trades: number;
    quoteVolume: number;
    buyVolume: number;
    quoteBuyVolume: number;
    timeStamp: number;
  }) {
    try {
      //TODO: handle not alphabet symbols like 1INCH
      const firstLetter = symbol.charAt(0).toLowerCase();
      const collection = this.db.collection(
        `candlesticks_${Group3Alphabet[firstLetter as keyof typeof Group3Alphabet]}_${interval}`,
      );
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
            interval,
            created_at: new Date(),
          },
          $push: {
            candles: {
              open: +open,
              high: +high,
              low: +low,
              close: +close,
              volume: +volume,
              trades: +trades,
              quote_volume: +quoteVolume,
              buy_volume: +buyVolume,
              quote_buy_volume: +quoteBuyVolume,
              timeStamp: new Date(timeStamp),
            },
          } as any,
        },
        {
          upsert: true,
          returnDocument: 'after',
        },
      );
    } catch (error) {
      this.logger.discord('error', '[insertCandlesticks:error]', JSON.stringify(error));
    }
  }
  listenCandlesticks = async ({ symbols, interval }: { symbols: typeof LISTEN_SYMBOLS; interval: string }) => {
    this.binance.websockets.candlesticks(symbols, interval, this.candlesticksHandler.bind(this));
  };
}
