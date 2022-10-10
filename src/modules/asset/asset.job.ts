export type FetchMarketDataJob = {
  name: 'asset:fetch:marketData';
};
export type FetchPricePerformanceStats = {
  name: 'asset:fetch:pricePerformanceStats';
};

export type AssetJobNames = 'asset:fetch:marketData' | 'asset:fetch:ohlcv' | 'asset:fetch:pricePerformanceStats';
export type AssetJobData = FetchMarketDataJob | FetchPricePerformanceStats;
