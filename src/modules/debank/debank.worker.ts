import { MetricsTime, Worker } from 'bullmq';
import { workerProcessor } from './debank.process';
import { redisConnection } from '../../loaders/config.loader';

export const worker = new Worker('debank', workerProcessor.bind(this), {
  autorun: true,
  connection: redisConnection,
  lockDuration: 1000 * 60 * 2.5,
  concurrency: 1,
  stalledInterval: 1000 * 30,
  skipLockRenewal: true,
  maxStalledCount: 5,
  metrics: {
    maxDataPoints: MetricsTime.ONE_WEEK,
  },
});

export const workerPortfolio = new Worker('debank-portfolio', workerProcessor.bind(this), {
  autorun: true,
  connection: redisConnection,
  lockDuration: 1000 * 60 * 2.5,
  concurrency: 10,
  stalledInterval: 1000 * 30,
  skipLockRenewal: true,
  maxStalledCount: 5,
  metrics: {
    maxDataPoints: MetricsTime.ONE_WEEK,
  },
});

export const workerInsert = new Worker('debank-insert', workerProcessor.bind(this), {
  autorun: true,
  connection: redisConnection,
  lockDuration: 1000 * 60,
  concurrency: 100,
  limiter: {
    max: 500,
    duration: 1000,
  },
  stalledInterval: 1000 * 60,
  maxStalledCount: 5,
  metrics: {
    maxDataPoints: MetricsTime.ONE_WEEK,
  },
});

export const workerWhale = new Worker('debank-whale', workerProcessor.bind(this), {
  autorun: true,
  connection: redisConnection,
  lockDuration: 1000 * 60,
  concurrency: 5,
  skipLockRenewal: true,

  limiter: {
    max: 50,
    duration: 1000,
  },
  stalledInterval: 1000 * 60,
  maxStalledCount: 5,
  metrics: {
    maxDataPoints: MetricsTime.ONE_WEEK,
  },
  // drainDelay: 1000 * 60 * 2,
});

export const workerTopHolder = new Worker('debank-top-holder', workerProcessor.bind(this), {
  autorun: true,
  connection: redisConnection,
  lockDuration: 1000 * 60 * 2.5,
  skipLockRenewal: true,
  concurrency: 5,
  stalledInterval: 1000 * 30,
  maxStalledCount: 5,
  metrics: {
    maxDataPoints: MetricsTime.ONE_WEEK,
  },
});

export const workerRanking = new Worker('debank-ranking', workerProcessor.bind(this), {
  autorun: true,
  connection: redisConnection,
  lockDuration: 1000 * 60,
  concurrency: 5,
  limiter: {
    max: 50,
    duration: 1000,
  },
  stalledInterval: 1000 * 60,
  maxStalledCount: 5,
  metrics: {
    maxDataPoints: MetricsTime.ONE_WEEK,
  },
});

export const workerCommon = new Worker('debank-common', workerProcessor.bind(this), {
  autorun: true,
  connection: redisConnection,
  lockDuration: 1000 * 60 * 5,
  concurrency: 5,
  limiter: {
    max: 60,
    duration: 60 * 1000,
  },
  stalledInterval: 1000 * 60,
  maxStalledCount: 5,
  metrics: {
    maxDataPoints: MetricsTime.ONE_WEEK,
  },
});
