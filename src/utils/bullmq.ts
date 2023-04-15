import { Logger } from '@/core/logger';
import { Queue, QueueEvents, QueueEventsOptions, QueueOptions } from 'bullmq';
const repeatStrategy = (times: number) => {
  return Math.max(Math.min(Math.exp(times), 20000), 1000);
};
export const initQueue = ({ queueName, opts }: { queueName: string; opts: QueueOptions }) => {
  const queue = new Queue(queueName, {
    settings: {
      repeatStrategy,
    },
    ...opts,
  });
  return queue;
};
export const initQueueListeners = ({
  queueName,
  opts: { connection },
}: {
  queueName: string;
  opts: QueueEventsOptions;
}) => {
  const queueEvents = new QueueEvents(queueName, {
    connection,
  });
  const logger = new Logger(queueName);
  queueEvents.on('error', (error) => {
    logger.alert('error', `${queueName}::Job failed`, error);
  });
  return queueEvents;
};
