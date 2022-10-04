import {
  BACKER,
  BaseInformationModel,
  CONVERT_CURRENCY_CODE,
  DEVELOPMENT_STATUS,
  IcoDetail,
  TeamPerson,
  Technology,
} from '@/types/Common';

interface valueByDate {
  timestamp?: string;
  value?: number;
}
type MarketData = {
  [key in keyof typeof CONVERT_CURRENCY_CODE]?: {
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    price?: number;
    tvl?: number;
    long: number;
    short: number;

    market_cap?: number;
    market_cap_dominance?: number;
    fully_diluted_market_cap?: number;
    market_cap_by_total_supply: number;

    volume_change_24h?: number;

    percent_change_1h?: number;
    percent_change_24h?: number;
    percent_change_7d?: number;

    volume?: number;
    volume_24h?: number;
    volume_7d?: number;
    volume_30d?: number;

    volume_24h_reported: number;
    volume_7d_reported: number;
    volume_30d_reported: number;

    list_price?: valueByDate[];
    list_price_1h?: valueByDate[];
    list_price_24h?: valueByDate[];
    list_price_7d?: valueByDate[];
    list_price_30d?: valueByDate[];
    list_price_90d?: valueByDate[];
    list_price_180d?: valueByDate[];
    list_price_365d?: valueByDate[];
    list_price_all_time?: valueByDate[];

    percent_change_30d: number;
    percent_change_60d: number;
    percent_change_90d?: number;

    list_market_cap_1d: valueByDate[];
    list_market_cap_7d: valueByDate[];
    list_market_cap_30d: valueByDate[];
    list_market_cap_90d: valueByDate[];
    list_market_cap_180d: valueByDate[];
    list_market_cap_365d: valueByDate[];
    list_market_cap_all_time: valueByDate[];

    last_updated?: Date;
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

export interface Coin extends BaseInformationModel {
  name: string;

  token_id: string;

  stack_exchange: string;

  blockchains: string[];

  whitepaper: string;

  wallets: string[];

  exchanges: string[];

  technologies?: Technology;

  services: string[];

  features: string[];

  team: TeamPerson[];

  ico: IcoDetail[];

  companies: [];

  market_data?: MarketData;

  potential?: string;

  reliability?: string;

  rating?: string;

  years?: number;

  market?: number;

  market_share?: number;

  dapp?: number;

  founded?: string;

  stage?: string;

  eco_market_cap?: number;

  backer?: BACKER;

  fundraising?: string;

  trans: {
    lang: string;
    about?: string;
    features?: string[];
    services?: string[];
  }[];

  community_vote?: number;

  token_allocation?: {
    name: string;
    amount: number;
    percent: number;
  }[];
}

export const _coin: Coin = {
  name: '',
  token_id: '',
  about: '',
  video: '',
  avatar: '',
  blog: '',
  facebook: '',
  youtube: '',
  reddit: '',
  website: '',
  telegram: '',
  twitter: '',
  discord: '',
  bitcoin_talk: '',
  gitter: '',
  medium: '',
  categories: [],
  explorer: '',
  stack_exchange: '',
  blockchains: [],
  whitepaper: '',
  wallets: [],
  exchanges: [],
  services: [],
  features: [],
  team: [],
  ico: [],
  companies: [],
  created_by: '',
  updated_by: '',
  created_at: new Date(),
  updated_at: new Date(),
  deleted: false,
  trans: [],
  market_data: {},
  potential: 'N/A',
  reliability: 'N/A',
  rating: 'N/A',
  years: 0,
  market: 0,
  market_share: 0,
  community_vote: 0,
  token_allocation: [],
};
