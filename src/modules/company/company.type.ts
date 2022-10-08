import {
  BaseInformationModel,
  ForeignReLationship,
  FundraisingRoundDetail,
  ResearchPaper,
  Support,
  TeamPerson,
} from '@/types/Common';

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
  short_description: string;
  cryptocurrencies: string[];
  country?: string;
  year_founded?: Date;
  total_amount?: string;
  firms?: any[];
  fundraising_rounds: FundraisingRoundDetail[];
  investors?: any[];
  _sync?: any[];
  type?: string;

  partners?: ForeignReLationship[];

  launched?: string;

  recent_investments?: ForeignReLationship[];

  current_roi?: number;

  ath_roi?: number;

  total_investments?: number;

  investments?: ForeignReLationship[];

  funding?: number;

  typical_project?: string;

  typical_category?: string;

  tier?: number;

  rating?: number;

  assets_allocation?: string;
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
  urls: {
    website: [],
    telegram: [],
    linkedin: [],
    twitter: [],
    discord: [],
    gitter: [],
    medium: [],
    bitcoin_talk: [],
    facebook: [],
    youtube: [],
    blog: [],
    github: [],
    reddit: [],
    stack_exchange: [],
    explorer: [],
    whitepaper: [],
  },
  short_description: '',
  cryptocurrencies: [],
  deleted: false,
  created_at: new Date(),
  updated_at: new Date(),
  year_founded: null,
  trans: [],
  fundraising_rounds: [],
};
