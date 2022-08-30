import { BaseInformationModel, DEVELOPMENT_STATUS, IcoDetail, TeamPerson, Technology } from '@/types/Common';

export interface Coin extends BaseInformationModel {
  name: string;
  token_id: string;
  about: string;
  video: string;
  avatar: string;
  blog: string;
  facebook: string;
  youtube: string;
  reddit: string;
  explorer: string;
  website: string;
  telegram: string;
  twitter: string;
  discord: string;
  bitcoin_talk: string;
  gitter: string;
  medium: string;
  categories?: string[];
  stack_exchange: string;
  blockchains: string[];
  whitepaper: string;
  wallets: string[];
  exchanges: string[];
  technologies: Technology[];
  services: string[];
  features: string[];
  team: TeamPerson[];
  ico: IcoDetail[];
  companies: [];
  trans: {
    lang: string;
    about?: string;
    features?: string[];
    services?: string[];
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
  technologies: [],
  services: [],
  features: [],
  team: [],
  ico: [],
  companies: [],
  deleted: false,
  created_at: new Date(),
  updated_at: new Date(),
  trans: [],
};
