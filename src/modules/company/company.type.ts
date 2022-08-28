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
  supports?: Support[];
  team?: TeamPerson[];
  research_papers?: ResearchPaper[];
  verified: boolean;
  about: string;
  video?: string;
  avatar: string;
  website: string;
  telegram: string;
  linkedin: string;
  twitter: string;
  discord: string;
  gitter: string;
  medium: string;
  bitcoin_talk: string;
  facebook: string;
  youtube: string;
  blog: string;
  github: string;
  reddit: string;
  explorer: string;
  stack_exchange: string;
  whitepaper: string;
  short_description: string;
  cryptocurrencies: string[];
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
};
