export type FetchMarketDateJob = {
  name: 'coin:fetch:marketData';
};

export type CoinJobNames = 'coin:fetch:marketData' | 'coin:fetch:ohlcv';
export type CoinJobData = FetchMarketDateJob;
