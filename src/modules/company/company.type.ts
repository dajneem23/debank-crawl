import { BaseInformationModel, FundraisingRoundDetail, ResearchPaper, Support, TeamPerson } from '@/types/Common';

export interface Company extends BaseInformationModel {
  name: string;
  headquarter?: string;
  location?: string;
  services?: string[];
  clients?: string[];
  products?: string[];
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
  year_founded?: Date;
  total_amount?: string;
  firms?: any[];
  fundraising_rounds: FundraisingRoundDetail[];
  investors?: any[];
  _sync?: any[];
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
  year_founded: null,
  trans: [],
  fundraising_rounds: [],
};
