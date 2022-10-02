import { BaseInformationModel, CONVERT_CURRENCY_CODE } from '@/types';

export interface Exchange extends BaseInformationModel {
  launched?: Date;

  notice?: string;

  fiats?: string[];

  type?: string;

  market_data?: MarketData;

  countries?: string[];

  status?: string;

  rank: number;
}
type MarketData = {
  [key in keyof typeof CONVERT_CURRENCY_CODE]?: {
    volume_24h?: number;
    volume_24h_adjusted?: number;
    volume_7d?: number;
    volume_30d: number;
    percent_change_volume_24h: number;
    percent_change_volume_7d: number;
    percent_change_volume_30d: number;
    effective_liquidity_24h: number;
  } & {
    maker_fee: number;

    taker_fee: number;

    weekly_visits: number;

    spot_volume_usd: number;

    spot_volume_last_updated: Date;

    num_coins: number;

    num_market_pairs: number;

    traffic_score: number;

    exchange_score: number;

    liquidity_score: number;
  };
};
export const _exchange: Exchange = {
  countries: [],
  categories: [],
  fiats: [],
  rank: 999999,
};
