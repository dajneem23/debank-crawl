// Generated by https://quicktype.io

export interface DexScreenerTradingHistory {
  schemaVersion: string;
  baseTokenSymbol: string;
  quoteTokenSymbol: string;
  tradingHistory: TradingHistory[];
}

export interface TradingHistory {
  blockNumber: number;
  blockTimestamp: Date;
  txnHash: string;
  logIndex: number;
  type: 'buy' | 'sell';
  priceUsd: string;
  volumeUsd: string;
  baseToken: string;
  quoteToken: string;
  baseTokenAddress: string;
  quoteTokenAddress: string;
  pairAddress: string;
  amount0: string;
  amount1: string;
  updatedAt: Date;
}

export interface Pair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  labels?: string[];
  baseToken: EToken;
  quoteToken: EToken;
  priceNative: string;
  priceUsd: string;
  txns: Txns;
  volume: PriceChange;
  priceChange: PriceChange;
  liquidity?: Liquidity;
  fdv: number;
  pairCreatedAt?: number;
  updatedAt: Date;
}

export interface EToken {
  address: string;
  name: string;
  symbol: string;
}

export interface Liquidity {
  usd: number;
  base: number;
  quote: number;
}

export interface PriceChange {
  h24: number;
  h6: number;
  h1: number;
  m5: number;
}

export interface Txns {
  h24: H1;
  h6: H1;
  h1: H1;
  m5: H1;
}

export interface H1 {
  buys: number;
  sells: number;
}