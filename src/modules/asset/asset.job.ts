export type AssetJobNames = 'asset:fetch:marketData' | 'asset:fetch:ohlcv' | 'asset:fetch:pricePerformanceStats';
export type AssetJobData = {
  name: AssetJobNames;
};
