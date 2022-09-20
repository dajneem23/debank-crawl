export type SendConfirmRequestCodeJob = {
  name: 'coin:fetch:marketData';
};

export type CoinJobNames = 'coin:fetch:marketData' | 'coin:fetch:ohlcv';
export type CoinJobData = SendConfirmRequestCodeJob;
