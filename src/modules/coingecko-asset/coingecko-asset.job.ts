export type fetchCoinGeckoDataJob = {
  name: CoinGeckoJobNames;
};

export type CoinGeckoJobNames = 'coingecko-asset:fetch:list' | 'coingecko-asset:fetch:details';

export type CoinGeckoJobData = fetchCoinGeckoDataJob;
