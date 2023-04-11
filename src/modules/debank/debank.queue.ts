import { sendTelegramMessage } from '@/service/alert/telegram';
import { redisConnection } from '@/loaders/config.loader';
import { initQueue, initQueueListeners } from '@/utils/bullmq';

export const queue = initQueue({
  queueName: 'debank',
  opts: {
    connection: redisConnection,
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

export const queuePortfolio = initQueue({
  queueName: 'debank-portfolio',
  opts: {
    connection: redisConnection,
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
export const queueApi = initQueue({
  queueName: 'debank-api',
  opts: {
    connection: redisConnection,
    defaultJobOptions: {
      // The total number of attempts to try the job until it completes
      attempts: 10,
      // delay: 1000 * 2,
      // Backoff setting for automatic retries if the job fails
      backoff: { type: 'exponential', delay: 10 * 1000 },
      removeOnComplete: {
        // 1 hour
        age: 60 * 60,
      },
      removeOnFail: {
        age: 60 * 60,
      },
    },
  },
});

export const queueInsert = initQueue({
  queueName: 'debank-insert',
  opts: {
    connection: redisConnection,
    defaultJobOptions: {
      // The total number of attempts to try the job until it completes
      attempts: 5,
      // Backoff setting for automatic retries if the job fails
      backoff: { type: 'exponential', delay: 10 * 1000 },
      removeOnComplete: {
        // 3 hour
        age: 60 * 60 * 1,
      },
      removeOnFail: {
        // 3 hour
        age: 60 * 60 * 1,
      },
    },
  },
});
export const queueWhale = initQueue({
  queueName: 'debank-whale',
  opts: {
    connection: redisConnection,
    defaultJobOptions: {
      // The total number of attempts to try the job until it completes
      attempts: 10,
      // Backoff setting for automatic retries if the job fails
      backoff: { type: 'exponential', delay: 10 * 1000 },
      removeOnComplete: {
        age: 60 * 60 * 3,
      },
      removeOnFail: {
        age: 60 * 60 * 3,
      },
    },
  },
});
export const queueTopHolder = initQueue({
  queueName: 'debank-top-holder',
  opts: {
    connection: redisConnection,
    defaultJobOptions: {
      // The total number of attempts to try the job until it completes
      attempts: 10,
      // Backoff setting for automatic retries if the job fails
      backoff: { type: 'exponential', delay: 10 * 1000 },
      removeOnComplete: {
        age: 60 * 60 * 3,
      },
      removeOnFail: {
        age: 60 * 60 * 3,
      },
    },
  },
});
export const queueRanking = initQueue({
  queueName: 'debank-ranking',
  opts: {
    connection: redisConnection,
    defaultJobOptions: {
      // The total number of attempts to try the job until it completes
      attempts: 10,
      // Backoff setting for automatic retries if the job fails
      backoff: { type: 'exponential', delay: 10 * 1000 },
      removeOnComplete: {
        age: 60 * 60 * 3,
      },
      removeOnFail: {
        age: 60 * 60 * 3,
      },
    },
  },
});
export const queueCommon = initQueue({
  queueName: 'debank-common',
  opts: {
    connection: redisConnection,
  },
});

(async () => {
  // do not init queue event if queue is already init
  if ((await queue.getQueueEvents()).length >= 1) {
    return;
  }
  const queuePortfolioEvents = initQueueListeners({
    queueName: 'debank-portfolio',
    opts: { connection: redisConnection },
  });
  queuePortfolioEvents.on('added', async ({ jobId }: { jobId: string }) => {
    const countJobs = await queue.getJobCounts();
    if (countJobs.waiting > 100000) {
      await sendTelegramMessage({
        message: `[debank-portfolio] queue is getting too big: ${countJobs.waiting}`,
      });
    }
  });

  // initQueueListeners({ queueName: 'debank-whale', opts: { connection: redisConnection } });

  const queueTopHoldersEvents = initQueueListeners({
    queueName: 'debank-top-holder',
    opts: { connection: redisConnection },
  });
  queueTopHoldersEvents.on('added', async ({ jobId }: { jobId: string }) => {
    const countJobs = await queueTopHolder.getJobCounts();
    if (countJobs.waiting > 500) {
      await sendTelegramMessage({
        message: `[Debank-top-holders-queue] is getting too big: ${countJobs.waiting}`,
      });
    }
  });

  // initQueueListeners({ queueName: 'debank-insert', opts: { connection: redisConnection } });

  // initQueueListeners({ queueName: 'debank-common', opts: { connection: redisConnection } });
})();
