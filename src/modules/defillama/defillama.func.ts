import { DefillamaAPI } from '@/common/api';

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
      searchWidth: '1h',
    },
  });

  const { coins } = data;
  return { coins };
};
