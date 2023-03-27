import { DIMongoClient } from '@/loaders/mongoDB.loader';
import { DIRedisClient } from '@/loaders/redis.loader';
import { Filter, FindOptions } from 'mongodb';
import Container from 'typedi';

export const getChains = async function (filter: Filter<any>, options?: FindOptions) {
  const mgClient = Container.get(DIMongoClient);
  const collection = mgClient.db('onchain').collection('chain');
  const chains = await collection.find(filter, options).toArray();

  return { chains };
};
export const getTokens = async function (filter: Filter<any>, options?: FindOptions) {
  const mgClient = Container.get(DIMongoClient);
  const collection = mgClient.db('onchain').collection('token');
  const tokens = await collection.find(filter, options).toArray();

  return { tokens };
};

export const getTokenOnRedis = async function ({ chainId, address }: { chainId: number; address: string }) {
  const redisClient = Container.get(DIRedisClient);
  const token = await redisClient.get(`token:${chainId}:${address}`);
  return token ? JSON.parse(token) : null;
};
export const saveAllTokensToRedis = async function () {
  const { chains } = await getChains({});
  const { tokens } = await getTokens({
    chainId: {
      $in: chains.map((chain) => chain.chainId),
    },
  });
  const data = tokens.reduce((acc, cur) => {
    acc.push(`token:${cur.chainId}:${cur.address}`);
    acc.push(JSON.stringify(cur));
    return acc;
  }, []);
  //bulk insert to redis
  const redisClient = Container.get(DIRedisClient);
  await redisClient.mSet(data);
};
