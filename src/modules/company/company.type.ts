import { BaseInformationModel, Feature, ResearchPaper, Service, Support, TeamPerson } from '@/types/Common';

export interface Company extends BaseInformationModel {
  name: string;

  director?: string;
  //map location
  headquarter?: object;

  location?: string;

  country?: string;

  features?: string[];

  services?: Array<Service>;

  //array id of company
  clients?: string[];

  //array id of project
  projects?: string[];

  //array id of product
  products?: string[];

  //array id of categories
  categories?: string[];

  galleries?: string[];

  //array id of coins
  crypto_currencies?: string[];

  portfolios?: string[];

  supports?: Support[];

  team?: TeamPerson[];

  research_papers?: ResearchPaper[];
}
