export type fetchExchangeInfoJob = {
  name: 'exchange:fetch:marketData';
};

export type ExchangeJobNames = 'exchange:fetch:info' | 'exchange:fetch:listingsLatest';

export type ExchangeJobData = fetchExchangeInfoJob;
