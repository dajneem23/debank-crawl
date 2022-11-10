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
  | 'defillama:fetch:tvl:protocol:tvl'
  | 'defillama:fetch:tvl:chains'
  | 'defillama:fetch:stablecoins';
export type DefillamaJobData = fetchDefillamaDataJob;
