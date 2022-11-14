export type DexscreenerJob = {
  name: DexscreenerJobNames;
  payload: any;
};

export type DexscreenerJobNames = 'dexscreener:add:fetch:trading-histories' | 'dexscreener:fetch:trading-histories';
