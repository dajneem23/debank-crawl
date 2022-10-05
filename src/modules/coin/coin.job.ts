export type FetchMarketDataJob = {
  name: 'coin:fetch:marketData';
};
export type FetchPricePerformanceStats = {
  name: 'coin:fetch:pricePerformanceStats';
};

export type CoinJobNames = 'coin:fetch:marketData' | 'coin:fetch:ohlcv' | 'coin:fetch:pricePerformanceStats';
export type CoinJobData = FetchMarketDataJob | FetchPricePerformanceStats;
