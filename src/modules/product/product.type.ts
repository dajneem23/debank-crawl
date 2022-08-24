import {
  BaseInformationModel,
  Feature,
  ContractAddress,
  TeamPerson,
  Support,
  ProductInfomation,
  App,
} from '@/types/Common';

export interface Product extends BaseInformationModel {
  name: string;

  director: string;

  contract_addresses: Array<ContractAddress>;

  crypto_currencies?: string[];

  //array id of categories
  categories?: string[];

  features?: string[];

  token: string;

  apps: App[];

  supports: Support[];

  galleries: string[];

  informations: ProductInfomation[];

  team: TeamPerson[];

  parent_company: string;

  team_location: string;
}

export const _product: Product = {
  name: '',
  director: '',
  contract_addresses: [],
  crypto_currencies: [],
  categories: [],
  features: [],
  token: '',
  apps: [],
  supports: [],
  galleries: [],
  informations: [],
  team: [],
  parent_company: '',
  team_location: '',
  deleted: false,
  created_at: new Date(),
  updated_at: new Date(),
};
