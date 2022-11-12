export type DexscreenerJob = {
  name: DexscreenerJobNames;
  payload: any;
};

export type DexscreenerJobNames = 'dexscreener:fetch:volume:protocols';
