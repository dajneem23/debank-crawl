import { DIRedisClient } from '@/loaders/redis.loader';
import Container from 'typedi';

export const queryRedisKeys = async (pattern: string): Promise<string[]> => {
  const redis = Container.get(DIRedisClient);
  const keys = await redis.keys(pattern);
  return keys;
};

export const insertRedisKey = async (key: string, value: string): Promise<void> => {
  const redis = Container.get(DIRedisClient);
  await redis.set(key, value);
};
