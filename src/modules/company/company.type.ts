import {
  BaseInformationModel,
  ForeignReLationship,
  FundraisingRoundDetail,
  ResearchPaper,
  Support,
  TeamPerson,
} from '@/types/Common';

export interface Company extends BaseInformationModel {
  headquarter?: string;

  location?: string;

  services?: string[];

  clients?: string[];

  products?: string[];

  portfolio_companies?: string[];

  portfolio_funds?: string[];

  supports?: Support[];

  team?: TeamPerson[];

  research_papers?: ResearchPaper[];

  countries?: string[];

  year_founded?: Date;

  cryptocurrencies: string[];

  // investments?: ForeignReLationship[];

  funding?: number;

  founders?: string[];

  person_investors?: string[];

  company_investors?: string[];

  investment_stage?: string[];

  //UI fields

  // typical_project?: string;

  // typical_category?: string;

  // tier?: number;

  // rating?: number;

  // assets_allocation?: string;

  //UI fields

  trans: {
    lang: string;
    description: string;
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
  supports: [],
  team: [],
  research_papers: [],
  avatar: '',
  short_description: '',
  cryptocurrencies: [],
  deleted: false,
  created_at: new Date(),
  updated_at: new Date(),
  year_founded: null,
  trans: [],
};
