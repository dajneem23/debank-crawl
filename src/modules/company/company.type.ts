import { BaseInformationModel, Feature, ResearchPaper, Service, Support, TeamPerson } from '@/types/Common';

export interface Company extends BaseInformationModel {
  name: string;
  headquarter?: string;
  location?: string;
  services?: string[];
  clients?: string[];
  products?: string[];
  categories?: string[];
  galleries?: string[];
  portfolios?: string[];
  video?: string;
  supports?: Support[];
  team?: TeamPerson[];
  research_papers?: ResearchPaper[];
  explorer: string;
  stack_exchange: string;
  whitepaper: string;
  short_description: string;
  cryptocurrencies: string[];
  country?: string;
  trans: {
    lang: string;
    about?: string;
    short_description?: string;
  }[];
}

export const _company: Company = {
  name: '',
  headquarter: '',
  location: '',
  services: [],
  clients: [],
  products: [],
  categories: [],
  galleries: [],
  portfolios: [],
  supports: [],
  team: [],
  research_papers: [],
  verified: false,
  about: '',
  video: '',
  avatar: '',
  website: '',
  telegram: '',
  linkedin: '',
  twitter: '',
  discord: '',
  gitter: '',
  medium: '',
  bitcoin_talk: '',
  facebook: '',
  youtube: '',
  blog: '',
  github: '',
  reddit: '',
  explorer: '',
  stack_exchange: '',
  whitepaper: '',
  short_description: '',
  cryptocurrencies: [],
  deleted: false,
  created_at: new Date(),
  updated_at: new Date(),
  trans: [],
};
