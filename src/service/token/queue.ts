import { DIRedisConnection } from '@/loaders/redis.loader';
import { MetricsTime, Queue, Worker } from 'bullmq';
import Container from 'typedi';
import { workerProcessor } from './processor';
import { updateTokensToRedis } from './handlers';
const job = {
  'update:tokens-to-redis': updateTokensToRedis,
};

const initRepeatJobs = async function (queue: Queue) {
  queue.add('update:tokens-to-redis', {}, {});
};
export const InitTokenQueue = async function () {
  const queueName = 'token';
  const redisConnection = Container.get(DIRedisConnection);
  const queue = new Queue(queueName, {
    connection: redisConnection,
    defaultJobOptions: {
      // The total number of attempts to try the job until it completes
      attempts: 5,
      // Backoff setting for automatic retries if the job fails
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: true,
      removeOnFail: true,
    },
  });

  const worker = new Worker(queueName, workerProcessor.bind(this), {
    autorun: true,
    connection: redisConnection,
    lockDuration: 1000 * 30,
    skipLockRenewal: true,
    stalledInterval: 1000 * 15,
    concurrency: 20,
    maxStalledCount: 5,
    metrics: {
      maxDataPoints: MetricsTime.TWO_WEEKS,
    },
  });

  initRepeatJobs(queue);
};