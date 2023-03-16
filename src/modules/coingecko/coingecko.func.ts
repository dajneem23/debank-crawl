import { CoinGeckoAPI } from '@/common/api';

export const getCoinMarketChartRange = async ({ coin_id, from, to }) => {
  const { data, status } = await CoinGeckoAPI.fetch({
    endpoint: CoinGeckoAPI.Coins.market_chart_range.endpoint.replace(':id', coin_id),
    params: {
      from,
      to,
      vs_currency: 'usd',
    },
  });

  const { prices, market_caps, total_volumes } = data;
  return { prices, market_caps, total_volumes };
};
