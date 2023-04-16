import { Logger } from '@/core/logger';
import Container from 'typedi';
import { pgClientToken, pgpToken } from '@/loaders/pg.loader';
import { DIMongoClient } from '@/loaders/mongoDB.loader';
import { DIRedisClient } from '@/loaders/redis.loader';
import { redisConnection } from '@/loaders/config.loader';
import { MetricsTime, WorkerOptions } from 'bullmq';

export const logger = new Logger('Debank');

export const pgp = Container.get(pgpToken);

export const mgClient = Container.get(DIMongoClient);

export const pgClient = Container.get(pgClientToken);

export const redisClient = Container.get(DIRedisClient);

export const WORKER_CONFIG: {
  [key: string]: WorkerOptions;
} = {
  debank: {
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
  },
  'debank-api': {
    autorun: true,
    connection: redisConnection,
    lockDuration: 1000 * 60 * 3,
    concurrency: 25,
    // limiter: {
    //   max: 50,
    //   duration: 1000 * 60,
    // },
    stalledInterval: 1000 * 30,
    skipLockRenewal: true,
    maxStalledCount: 5,
    metrics: {
      maxDataPoints: MetricsTime.ONE_WEEK,
    },
  },
  'debank-insert': {
    autorun: true,
    connection: redisConnection,
    lockDuration: 1000 * 60,
    concurrency: 50,
    // limiter: {
    //   max: 500,
    //   duration: 1000,
    // },
    stalledInterval: 1000 * 60,
    maxStalledCount: 5,
    metrics: {
      maxDataPoints: MetricsTime.ONE_WEEK,
    },
  },
  'debank-whale': {
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
  },
  'debank-top-holder': {
    autorun: true,
    connection: redisConnection,
    lockDuration: 1000 * 60 * 2.5,
    concurrency: 2,
    skipLockRenewal: true,

    stalledInterval: 1000 * 15,
    maxStalledCount: 5,
    metrics: {
      maxDataPoints: MetricsTime.ONE_WEEK,
    },
  },
  'debank-portfolio': {
    autorun: true,
    connection: redisConnection,
    lockDuration: 1000 * 60 * 3.5,
    concurrency: 7,
    skipLockRenewal: true,

    stalledInterval: 1000 * 15,
    maxStalledCount: 5,
    metrics: {
      maxDataPoints: MetricsTime.ONE_WEEK,
    },
  },
  'debank-ranking': {
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
  },
  'debank-common': {
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
  },
};
