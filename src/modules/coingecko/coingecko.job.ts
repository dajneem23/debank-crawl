export type fetchCoinGeckoDataJob = {
  name: CoinGeckoJobNames;
};

export type CoinGeckoJobNames =
  | 'coingecko:fetch:assets:list'
  | 'coingecko:fetch:assets:details'
  | 'coingecko:fetch:categories:list'
  | 'coingecko:fetch:blockchains:list'
  | 'coingecko:fetch:exchanges:list'
  | 'coingecko:fetch:exchanges:details'
  | 'coingecko:fetch:categories:listWithMarketData'
  | 'coingecko:fetch:cryptocurrency:global';
export type CoinGeckoJobData = fetchCoinGeckoDataJob;
