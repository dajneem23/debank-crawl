import {
  BACKER,
  BaseInformationModel,
  CONVERT_CURRENCY_CODE,
  IcoDetail,
  TeamPerson,
  Technology,
  TIME_PERIOD,
} from '@/types/Common';
import { MarketData } from '../asset-price/asset-price.type';

export interface Asset extends BaseInformationModel {
  symbol: string;

  blockchains: string[];
  wallets: string[];
  exchanges: string[];

  services: string[];
  features: string[];

  product?: string; // product_slug
  project?: string; // project_slug
  company?: string; // company_slug

  team: TeamPerson[];
  ico: IcoDetail[];
  technologies?: Technology;
  market_data?: MarketData;

  token_allocation?: {
    name: string;
    amount: number;
    percent: number;
  }[];

  trans: {
    lang: string;
    description?: string;
    features?: string[];
    services?: string[];
  }[];

  tvl_ratio?: number;
  num_market_pairs?: number;
  market_cap?: number;
  self_reported_market_cap?: number;
  market_cap_dominance?: number;
  fully_diluted_market_cap?: number;
  market_cap_by_total_supply?: number;
  total_supply?: number;
  circulating_supply?: number;
  self_reported_circulating_supply?: number;
  max_supply?: number;
  price?: number;
  cmc_rank?: number;
  percent_change_24h?: number;
  percent_change_7d?: number;
  percent_change_30d?: number;
  percent_change_60d?: number;
  percent_change_90d?: number;

  // potential?: string;

  // reliability?: string;

  // rating?: string;

  // years?: number;

  // market?: number;

  // market_share?: number;

  // dapp?: number;

  // founded?: string;

  // stage?: string;

  // eco_market_cap?: number;

  // backer?: BACKER;

  // fundraising?: string;

  // community_vote?: number;
}

export const _asset: Asset = {
  name: '',
  symbol: '',
  avatar: '',
  categories: [],
  blockchains: [],
  wallets: [],
  exchanges: [],
  services: [],
  features: [],
  team: [],
  ico: [],
  created_by: '',
  updated_by: '',
  created_at: new Date(),
  updated_at: new Date(),
  deleted: false,
  trans: [],
  market_data: {},
  // potential: 'N/A',
  // reliability: 'N/A',
  // rating: 'N/A',
  // years: 0,
  // market: 0,
  // market_share: 0,
  // community_vote: 0,
  token_allocation: [],
};
