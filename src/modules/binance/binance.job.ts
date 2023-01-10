export type fetchBinanceDataJob = {
  name: BinanceJobNames;
};

export type BinanceJobNames = 'binance:insert:candlestick';
export type BinanceJobData = fetchBinanceDataJob;
