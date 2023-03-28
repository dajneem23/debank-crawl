import { DIRedisConnection } from '@/loaders/redis.loader';
import { Job, MetricsTime, Queue, Worker } from 'bullmq';
import Container from 'typedi';
import { workerProcessor } from './processor';
import { updateTokensToRedis } from './handlers';
import { DILogger } from '@/loaders/logger.loader';
const job = {
  'update:tokens-to-redis': updateTokensToRedis,
};

const initRepeatJobs = async function (queue: Queue) {
  queue.add(
    'update:tokens-to-redis',
    {},
    {
      repeatJobKey: 'update:tokens-to-redis',
      jobId: 'update:tokens-to-redis',
      repeat: {
        every: 1000 * 60 * 5,
      },
      removeOnComplete: true,
      removeOnFail: false,
      priority: 1,
      attempts: 5,
    },
  );
};
export const InitTokenQueue = async function () {
  const logger = Container.get(DILogger);
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
  worker.on('failed', ({ id, name, data, failedReason }: Job<any>, error: Error) => {
    logger.discord('error', '[job:Token:error]', id, name, failedReason, JSON.stringify(data), JSON.stringify(error));
  });
  initRepeatJobs(queue);
};
