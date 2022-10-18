import { BaseInformationModel, ContractAddress, TeamPerson, Support, ProductInformation, App } from '@/types/Common';

export interface Product extends BaseInformationModel {
  name: string;
  avatar: string;
  contract_addresses: ContractAddress[];
  cryptocurrencies?: string[];
  features?: string[];
  apps: App[];
  supports: Support[];
  galleries: string[];
  information: ProductInformation[];
  team: TeamPerson[];
  parent_company: string;
  team_location: string;
  trans: {
    lang: string;
    about?: string;
  }[];
}

export const _product: Product = {
  name: '',
  avatar: '',
  contract_addresses: [],
  cryptocurrencies: [],
  categories: [],
  features: [],
  apps: [],
  supports: [],
  galleries: [],
  information: [],
  team: [],
  parent_company: '',
  team_location: '',
  trans: [],
  deleted: false,
  created_at: new Date(),
  updated_at: new Date(),
};
