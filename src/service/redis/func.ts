import { DIRedisClient } from '@/loaders/redis.loader';
import Container from 'typedi';

export const getRedisKeys = async (pattern: string): Promise<string[]> => {
  const redis = Container.get(DIRedisClient);
  const keys = await redis.keys(pattern);
  return keys;
};

export const setRedisKey = async (key: string, value: string): Promise<void> => {
  const redis = Container.get(DIRedisClient);
  await redis.set(key, value);
};

export const setExpireRedisKey = async ({
  key,
  value,
  expire,
}: {
  key: string;
  value: string;
  expire: number;
}): Promise<void> => {
  const redis = Container.get(DIRedisClient);
  await redis.set(key, value, {
    EX: expire,
  });
};
