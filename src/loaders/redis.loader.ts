import { createClient, RedisClientType } from 'redis';
import { Container, Token } from 'typedi';
import { DILogger } from './logger.loader';
import IORedis from 'ioredis';
import { setExpireRedisKey } from '../service/redis/func';
import { getTokenOnRedis, saveAllTokensToRedis } from '../service/token/func';

export const DIRedisClient = new Token<RedisClientType>('redisClient');

export const DIRedisConnection = new Token<IORedis>('redisClient');

export const redisClientLoader = async () => {
  const logger = Container.get(DILogger);

  // Create client
  const client = createClient({ url: process.env.REDIS_URI });

  const connection = new IORedis(process.env.REDIS_URI, { maxRetriesPerRequest: null, enableReadyCheck: false });

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
