import {
  BACKER,
  BaseInformationModel,
  CONVERT_CURRENCY_CODE,
  IcoDetail,
  TeamPerson,
  Technology,
  TIME_PERIOD,
} from '@/types/Common';

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
type MarketData = {
  [key in keyof typeof CONVERT_CURRENCY_CODE]?: {
    [key in keyof typeof TIME_PERIOD]?: TimePeriodPrice & {
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
    };
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

  cmc_rank: number;

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
  cmc_rank: 0,
};
