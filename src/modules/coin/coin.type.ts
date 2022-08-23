import { BaseInformationModel, DEVELOPMENT_STATUS } from '@/types/Common';

export interface Coin extends BaseInformationModel {
  name: string;

  token_id: string;

  categories?: Array<string>;

  explorer: string;

  stack_exchange: string;

  blockchains: Array<string>;

  whitepaper: string;

  wallets: string[];

  exchanges: string[];

  technologies: object[];

  services: object[];

  features: object[];

  team: object[];

  ico: object[];
}
