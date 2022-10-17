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
  name: string;

  token_id: string;

  blockchains: string[];

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
