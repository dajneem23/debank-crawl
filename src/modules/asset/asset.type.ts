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
  token_id: string;

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
    about?: string;
    features?: string[];
    services?: string[];
  }[];

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
  token_id: '',
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
