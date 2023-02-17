import { createClient, RedisClientType } from 'redis';
import { Container, Token } from 'typedi';
import { DILogger } from '@/loaders/logger.loader';
import env from '@/config/env';
import IORedis from 'ioredis';

export const DIRedisClient = new Token<RedisClientType>('redisClient');

export const DIRedisConnection = new Token<IORedis>('redisClient');

export const redisClientLoader = async () => {
  const logger = Container.get(DILogger);

  // Create client
  const client = createClient({ url: env.REDIS_URI });

  const connection = new IORedis(env.REDIS_URI, { maxRetriesPerRequest: null, enableReadyCheck: false });

  // Listeners
  client.on('connect', () => logger.info('connected', 'Redis'));
  client.on('error', (err) => logger.error('error', err));
  client.on('reconnecting', () => logger.warn('reconnecting', 'Redis'));

  // Connect
  await client.connect();
  Container.set(DIRedisClient, client);
  Container.set(DIRedisConnection, connection);

  return client;
};

export default redisClientLoader;
