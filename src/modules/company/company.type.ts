import { BaseInformationModel, Feature, Gallery, Service } from '@/types/Common';

export interface Company extends BaseInformationModel {
  name: string;

  director?: string;

  //map location
  headquarter?: object;

  //array id of teams
  teams?: Array<string>;

  country?: string;

  features?: Array<string>;

  services?: Array<Service>;

  //array id of company
  clients?: Array<string>;

  //array id of project
  projects?: Array<string>;

  //array id of product
  products?: Array<string>;

  //array id of categories
  categories?: Array<string>;

  galleries?: Array<Gallery>;
  //array id of coins
  crypto_currencies?: Array<string>;

  portfolios?: Array<string>;

  ccys?: Array<string>;
}
