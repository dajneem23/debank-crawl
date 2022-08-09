import { BaseInformationModel, Feature, Gallery, Service } from '@/types/Common';

export interface Company extends BaseInformationModel {
  name: string;

  directors?: string;
  //map location
  headquarter?: object;

  //array id of persons
  teams?: Array<string>;

  country?: string;

  features?: Array<Feature>;

  services?: Array<Service>;

  //array id of company
  clients?: Array<string>;

  //array id of project
  projects?: Array<string>;

  //array id of product
  products?: Array<string>;

  //array id of sector
  sector?: Array<string>;

  //array id of categories
  categories?: Array<string>;

  galleries?: Array<Gallery>;

  crypto_currencies?: Array<string>;
}
