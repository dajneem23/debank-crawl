import { BaseInformationModel, ContractAddress, TeamPerson, Support, ProductInformation, App } from '@/types/Common';

export interface Product extends BaseInformationModel {
  company?: string;
  project?: string;

  wallets?: Wallet[];
  apps: App[];
  contract_addresses?: ContractAddress[];
  cryptocurrencies?: string[];

  features?: string[];
  services?: string[];
  supports?: Support[];

  information?: ProductInformation[];

  team?: TeamPerson[];

  trans: {
    lang: string;
    description?: string;
    short_description?: string;
    features?: string[];
    services?: string[];
  }[];
}
export const _product: Product = {
  name: '',
  avatar: '',
  contract_addresses: [],
  cryptocurrencies: [],
  categories: [],
  features: [],
  wallets: [],
  apps: [],
  supports: [],
  information: [],
  team: [],
  trans: [],
  deleted: false,
  created_at: new Date(),
  updated_at: new Date(),
};
export type Wallet = {
  name?: string;
  address: string;
  explore_url?: string;
};
