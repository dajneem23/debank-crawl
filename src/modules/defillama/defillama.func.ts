import { DefillamaAPI } from '@/common/api';
import { getMgOnChainDbName } from '@/common/db';
import { DIMongoClient } from '@/loaders/mongoDB.loader';
import Bluebird from 'bluebird';
import Container from 'typedi';
import cacache from 'cacache';
import { CACHE_PATH } from '@/common/cache';

export const getBatchHistorical = async ({ coins: _coins }) => {
  const { data, status } = await DefillamaAPI.fetch({
    endpoint: DefillamaAPI.BatchHistorical.endpoint,
    params: {
      coins: _coins,
    },
  });

  const { coins } = data;
  return { coins };
};

export const getCoinsHistorical = async ({ coins: _coins, timestamp }) => {
  const { data, status } = await DefillamaAPI.fetch({
    endpoint: DefillamaAPI.Coins.historical.endpoint.replace(':coins', _coins).replace(':timestamp', timestamp),
    params: {
      searchWidth: '2h',
    },
  });

  const { coins } = data;
  return { coins };
};

export const updateCoinsHistoricalKeyCache = async ({ id }) => {
  const mgClient = Container.get(DIMongoClient);
  const tokensTimestamps = await mgClient
    .db(getMgOnChainDbName())
    .collection('token-price-timestamp')
    .find({})
    .toArray();
  const tokensTimestampsKeyMap = tokensTimestamps.reduce((acc, cur) => {
    acc.push({ id, key: `${cur.id}-${cur.timestamp}` });
    return acc;
  }, []);
  await Bluebird.map(
    tokensTimestampsKeyMap,
    async ({ key, id }) => {
      const isExist = await cacache.get.hasContent(`${CACHE_PATH}/${id}`, key);
      if (!isExist) {
        await cacache.put(`${CACHE_PATH}/defillama/${id}`, key, { id, key });
      }
    },
    {
      concurrency: 100,
    },
  );
};
