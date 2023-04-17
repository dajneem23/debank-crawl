import { createClient, RedisClientType } from 'redis';
import { Container, Token } from 'typedi';
import { DILogger } from './logger.loader';
import IORedis from 'ioredis';
import { sendTelegramMessage } from '@/service/alert/telegram';

export const DIRedisClient = new Token<RedisClientType>('redisClient');

export const DIRedisConnection = new Token<IORedis>('redisClient');

export const redisClientLoader = async () => {
  const logger = Container.get(DILogger);

  // Create client
  const client = createClient({ url: process.env.REDIS_URI });

  const connection = new IORedis(process.env.REDIS_URI, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
    retryStrategy: (times) => {
      return Math.max(Math.min(Math.exp(times), 20000), 1000);
    },
  });

  // Listeners
  client.on('connect', () => logger.info('connected', 'Redis'));
  client.on('error', (err) => sendTelegramMessage({ message: `Redis error: ${err.message}` }));
  client.on('reconnecting', () => logger.warn('reconnecting', 'Redis'));

  // Connect
  await client.connect();
  Container.set(DIRedisClient, client);
  Container.set(DIRedisConnection, connection);
  return client;
};

export default redisClientLoader;
