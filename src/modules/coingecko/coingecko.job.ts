export type fetchCoinGeckoDataJob = {
  name: CoinGeckoJobNames;
};

export type CoinGeckoJobNames =
  | 'coingecko:fetch:asset:list'
  | 'coingecko:fetch:asset:details'
  | 'coingecko:fetch:categories:list'
  | 'coingecko:fetch:blockchains:list';

export type CoinGeckoJobData = fetchCoinGeckoDataJob;
