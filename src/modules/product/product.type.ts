import { BaseInformationModel, ContractAddress, TeamPerson, Support, ProductInformation, App } from '@/types/Common';

export interface Product extends BaseInformationModel {
  name: string;
  avatar: string;
  contract_addresses: Array<ContractAddress>;
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
  verified: false,
  sponsored: false,
  about: '',
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
  website: '',
  facebook: '',
  telegram: '',
  twitter: '',
  youtube: '',
  discord: '',
  medium: '',
  reddit: '',
  blog: '',
  rocket_chat: '',
  trans: [],
  deleted: false,
  created_at: new Date(),
  updated_at: new Date(),
};
