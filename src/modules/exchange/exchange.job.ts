export type fetchExchangeDataJob = {
  name: 'exchange:fetch:data';
};

export type ExchangeJobNames = 'exchange:fetch:data' | 'exchange:fetch:listingsLatest';

export type ExchangeJobData = fetchExchangeDataJob;