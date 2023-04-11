import { Logger } from '@/core/logger';
import Container from 'typedi';
import { pgClientToken, pgpToken } from '@/loaders/pg.loader';
import { DIMongoClient } from '@/loaders/mongoDB.loader';
import { DIRedisClient } from '@/loaders/redis.loader';

export const logger = new Logger('Debank');

export const pgp = Container.get(pgpToken);

export const mgClient = Container.get(DIMongoClient);

export const pgClient = Container.get(pgClientToken);

export const redisClient = Container.get(DIRedisClient);
