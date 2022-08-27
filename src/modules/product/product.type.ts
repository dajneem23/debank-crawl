import { BaseInformationModel, ContractAddress, TeamPerson, Support, ProductInfomation, App } from '@/types/Common';

export interface Product extends BaseInformationModel {
  name: string;
  avatar: string;
  verified: boolean;
  sponsored: boolean;
  about: string;
  contract_addresses: Array<ContractAddress>;
  crypto_currencies?: string[];
  categories?: string[];
  features?: string[];
  apps: App[];
  supports: Support[];
  galleries: string[];
  informations: ProductInfomation[];
  team: TeamPerson[];
  parent_company: string;
  team_location: string;
  website: string;
  facebook: string;
  telegram: string;
  twitter: string;
  youtube: string;
  discord: string;
  medium: string;
  reddit: string;
  blog: string;
  rocket_chat: string;
}

export const _product: Product = {
  name: '',
  avatar: '',
  verified: false,
  sponsored: false,
  about: '',
  contract_addresses: [],
  crypto_currencies: [],
  categories: [],
  features: [],
  apps: [],
  supports: [],
  galleries: [],
  informations: [],
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
  deleted: false,
  created_at: new Date(),
  updated_at: new Date(),
};
