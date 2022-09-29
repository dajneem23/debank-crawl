import { BACKER, BaseInformationModel, DEVELOPMENT_STATUS, IcoDetail, TeamPerson, Technology } from '@/types/Common';

interface Price {
  date?: string;
  value?: number;
}

interface MarketData {
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  market_cap?: number;
  market_cap_dominance?: number;
  fully_diluted_market_cap?: number;
  price?: number;
  volume_change_24h?: number;
  percent_change_1h?: number;
  latest_price_1h?: number[];
  percent_change_24h?: number;
  latest_price_24h?: number[];
  percent_change_7d?: number;
  latest_price_7d?: number[];
  volume_24h?: number;
  volume_7d?: number;
  volume_30d?: number;
  percent_change_90d?: number;
  list_price?: Price[];
  list_price_1h?: Price[];
  list_price_24h?: Price[];
  list_price_7d?: Price[];
  last_updated?: Date;
  tvl?: number;
  long: number;
  short: number;
}

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

  market_data?: { [key: string]: MarketData };

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
};
