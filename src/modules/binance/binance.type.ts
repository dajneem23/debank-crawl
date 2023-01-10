export type chartResponse = {
  [key: string]: {
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
  };
};
//READ MORE: https://binance-docs.github.io/apidocs/spot/en/#kline-candlestick-streams
export interface CandleTick {
  e: string;
  E: number;
  s: string;
  k: K;
}

export interface K {
  t: number;
  T: number;
  s: string;
  i: string;
  f: number;
  L: number;
  o: string;
  c: string;
  h: string;
  l: string;
  v: string;
  n: number;
  x: boolean;
  q: string;
  V: string;
  Q: string;
  B: string;
}
