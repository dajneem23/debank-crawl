export type fetchCoinGeckoDataJob = {
  name: CoinGeckoJobNames;
};

export enum CoinGeckoJobNames {
  'coingecko:fetch:assets:list' = 'coingecko:fetch:assets:list',
  'coingecko:fetch:assets:details' = 'coingecko:fetch:assets:details',
  'coingecko:add:fetch:assets:details' = 'coingecko:add:fetch:assets:details',
  'coingecko:fetch:categories:list' = 'coingecko:fetch:categories:list',
  'coingecko:fetch:blockchains:list' = 'coingecko:fetch:blockchains:list',
  'coingecko:fetch:exchanges:list' = 'coingecko:fetch:exchanges:list',
  'coingecko:fetch:exchanges:details' = 'coingecko:fetch:exchanges:details',
  'coingecko:add:fetch:exchanges:details' = 'coingecko:add:fetch:exchanges:details',
  'coingecko:fetch:categories:listWithMarketData' = 'coingecko:fetch:categories:listWithMarketData',
  'coingecko:fetch:cryptocurrency:global' = 'coingecko:fetch:cryptocurrency:global',
  'coingecko:fetch:coin:details' = 'coingecko:fetch:coin:details',

  'coingecko:add:fetch:debank:coins' = 'coingecko:add:fetch:debank:coins',

  'coingecko:fetch:important:token:price' = 'coingecko:fetch:important:token:price',

  'coingecko:add:fetch:important:token:price' = 'coingecko:add:fetch:important:token:price',
}
export type CoinGeckoJobData = fetchCoinGeckoDataJob;
