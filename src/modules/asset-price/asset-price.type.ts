import { BaseModel, CONVERT_CURRENCY_CODE, TIME_PERIOD } from '@/types/Common';

interface valueByDate {
  timestamp?: string;
  value?: number;
}
type TimePeriodPrice = {
  percent_change?: number;
  price?: number;
  close?: number;
  high?: number;
  low?: number;
  open?: number;
  close_timestamp?: Date;
  high_timestamp?: Date;
  low_timestamp?: Date;
  open_timestamp?: Date;
  volume?: number;
  volume_change?: number;
  volume_reported?: number;
  list_price?: valueByDate[];
  list_market_cap?: valueByDate[];
};
export type MarketData = {
  [key in keyof typeof CONVERT_CURRENCY_CODE]?: {
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    price?: number;
    tvl?: number;
    long?: number;
    short?: number;

    market_cap?: number;
    market_cap_dominance?: number;
    fully_diluted_market_cap?: number;
    market_cap_by_total_supply?: number;

    volume?: number;

    list_price?: valueByDate[];

    last_updated?: Date;
  } & {
    [key in keyof typeof TIME_PERIOD]?: TimePeriodPrice;
  } & {
    circulating_supply: number;

    total_supply: number;

    max_supply: number;

    num_market_pairs: number;

    tvl_ratio: number;

    self_reported_circulating_supply: number;

    self_reported_market_cap: number;
  };
};

export interface AssetPrice extends BaseModel {
  name: string;

  symbol: string;

  slug: string;

  market_data?: MarketData;
}
