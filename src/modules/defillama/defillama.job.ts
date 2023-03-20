export type fetchDefillamaDataJob = {
  name: DefillamaJobNames;
};

export type DefillamaJobNames =
  | 'defillama:fetch:tvl:protocols'
  | 'defillama:add:tvl:protocol:details'
  | 'defillama:fetch:tvl:protocol:detail'
  | 'defillama:fetch:tvl:protocol:tvl'
  | 'defillama:fetch:tvl:charts'
  | 'defillama:fetch:tvl:charts:details'
  | 'defillama:fetch:tvl:charts:chain'
  | 'defillama:add:tvl:charts:chains'
  | 'defillama:add:tvl:protocol:tvl'
  | 'defillama:fetch:tvl:chains'
  | 'defillama:fetch:stablecoins:list'
  // | 'defillama:fetch:coin:historical:data:id'
  | 'defillama:fetch:coin:historical:data:id:timestamp'
  | 'defillama:update:usd:value:of:transaction'
  | 'defillama:fetch:coins:historical:data'
  | 'defillama:add:fetch:coin:historical'
  | 'defillama:update:coin:historical:key:cache'
  | 'defillama:add:update:usd:value:of:transaction'
  | 'defillama:add:pool:of:transaction'
  | 'defillama:update:pool:of:transaction'
  | 'defillama:update:coins:current:price'
  | 'defillama:add:update:coins:current:price';
export type DefillamaJobData = fetchDefillamaDataJob;
