export type fetchExchangeDataJob = {
  name: ExchangeJobNames;
};

export type ExchangeJobNames = 'exchange:fetch:data' | 'exchange:fetch:listingsLatest';

export type ExchangeJobData = fetchExchangeDataJob;
