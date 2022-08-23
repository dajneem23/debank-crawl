import { BaseInformationModel, Feature, ContractAddress } from '@/types/Common';

export interface Product extends BaseInformationModel {
  name: string;

  director: string;

  contract_addresses: Array<ContractAddress>;

  crypto_currencies?: Array<string>;

  //array id of categories
  categories?: Array<string>;

  features?: Array<string>;

  token: string;

  apps: Array<object>;

  supports: Array<object>;

  galleries: Array<string>;

  informations: Array<object>;

  team: Array<object>;

  parent_company: string;

  team_location: string;
}
