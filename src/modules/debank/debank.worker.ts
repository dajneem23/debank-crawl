import { redisConnection } from '@/loaders/config.loader';
import { sendTelegramMessage } from '@/service/alert/telegram';
import { setRedisKey } from '@/service/redis';
import { MetricsTime, Worker } from 'bullmq';
import { mgClient } from './debank.config';
import { workerProcessor } from './debank.process';
import { queueApi, queuePortfolio, queueRanking, queueTopHolder } from './debank.queue';

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
  lockDuration: 1000 * 60 * 4,
  concurrency: 6,
  // limiter: {
  //   max: 15,
  //   duration: 1000 * 60,
  // },
  stalledInterval: 1000 * 30,
  skipLockRenewal: true,
  maxStalledCount: 5,
  metrics: {
    maxDataPoints: MetricsTime.ONE_WEEK,
  },
});
workerPortfolio.on('failed', async (job, err) => {
  try {
    await mgClient
      .db('onchain-log')
      .collection('debank-portfolio')
      .insertOne({
        from: 'debank-portfolio',
        job: JSON.parse(JSON.stringify(job)),
        err: err.message,
      });
    await setRedisKey(
      `debank:jobs:portfolio:failed:${job.id}`,
      JSON.stringify({
        name: job.name,
        data: job.data,
        opts: job.opts,
      }),
    );
  } catch (error) {
    console.error(error);
  }
});
workerPortfolio.on('drained', async () => {
  try {
    const keys = await redisConnection.keys('debank:jobs:portfolio:failed:*');
    if (keys.length > 0) {
      const jobs = await redisConnection.mget(keys);
      await queuePortfolio.addBulk(jobs.map((job) => JSON.parse(job)));
      await redisConnection.del(keys);
      sendTelegramMessage({
        message: `🚀 Debank portfolio jobs recovered: ${jobs.length}`,
      });
    }
  } catch (error) {}
});

export const workerApi = new Worker('debank-api', workerProcessor.bind(this), {
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
});
workerApi.on('failed', async (job, err) => {
  try {
    await mgClient
      .db('onchain-log')
      .collection('debank-api')
      .insertOne({
        from: 'debank-api',
        job: JSON.parse(JSON.stringify(job)),
        err: err.message,
      });
    await setRedisKey(
      `debank:jobs:api:failed:${job.id}`,
      JSON.stringify({
        name: job.name,
        data: job.data,
        opts: job.opts,
      }),
    );
  } catch (error) {}
});
workerApi.on('drained', async () => {
  try {
    const keys = await redisConnection.keys('debank:jobs:api:failed:*');
    if (keys.length > 0) {
      const jobs = await redisConnection.mget(keys);
      await queueApi.addBulk(jobs.map((job) => JSON.parse(job)));
      await redisConnection.del(keys);
      sendTelegramMessage({
        message: `🚀 Debank api jobs recovered: ${jobs.length}`,
      });
    }
  } catch (error) {}
});
export const workerInsert = new Worker('debank-insert', workerProcessor.bind(this), {
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
  lockDuration: 1000 * 60 * 3.5,
  concurrency: 5,

  skipLockRenewal: true,
  stalledInterval: 1000 * 15,
  maxStalledCount: 5,
  metrics: {
    maxDataPoints: MetricsTime.ONE_WEEK,
  },
});
workerTopHolder.on('failed', async (job, err) => {
  try {
    await mgClient
      .db('onchain-log')
      .collection('debank-top-holder')
      .insertOne({
        from: 'debank-top-holder',
        job: JSON.parse(JSON.stringify(job)),
        err: err.message,
      });
    await setRedisKey(
      `debank:jobs:top-holder:failed:${job.id}`,
      JSON.stringify({
        name: job.name,
        data: job.data,
        opts: job.opts,
      }),
    );
  } catch (error) {}
});
workerTopHolder.on('drained', async () => {
  try {
    const keys = await redisConnection.keys('debank:jobs:top-holder:failed:*');
    if (keys.length > 0) {
      const jobs = await redisConnection.mget(keys);
      await queueTopHolder.addBulk(jobs.map((job) => JSON.parse(job)));
      await redisConnection.del(keys);
      sendTelegramMessage({
        message: `🚀 Debank top holder jobs recovered: ${jobs.length}`,
      });
    }
  } catch (error) {}
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
workerRanking.on('failed', async (job, err) => {
  try {
    await mgClient
      .db('onchain-log')
      .collection('debank-ranking')
      .insertOne({
        from: 'debank-ranking',
        job: JSON.parse(JSON.stringify(job)),
        err: err.message,
      });
    await setRedisKey(
      `debank:jobs:ranking:failed:${job.id}`,
      JSON.stringify({
        name: job.name,
        data: job.data,
        opts: job.opts,
      }),
    );
  } catch (error) {}
});
workerRanking.on('drained', async () => {
  try {
    const keys = await redisConnection.keys('debank:jobs:ranking:failed:*');
    if (keys.length > 0) {
      const jobs = await redisConnection.mget(keys);
      await queueRanking.addBulk(jobs.map((job) => JSON.parse(job)));
      await redisConnection.del(keys);
      sendTelegramMessage({
        message: `🚀 Debank ranking jobs recovered: ${jobs.length}`,
      });
    }
  } catch (error) {}
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
