import { Logger } from '@/core/logger';
import { Queue, QueueEvents, QueueEventsOptions, QueueOptions } from 'bullmq';

export const initQueue = ({ queueName, opts }: { queueName: string; opts: QueueOptions }) => {
  const queue = new Queue(queueName, {
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
