import { BaseInformationModel, DEVELOPMENT_STATUS, IcoDetail, TeamPerson, Technology } from '@/types/Common';

export interface Coin extends BaseInformationModel {
  name: string;

  token_id: string;

  categories?: string[];

  explorer: string;

  stack_exchange: string;

  blockchains: string[];

  whitepaper: string;

  wallets: string[];

  exchanges: string[];

  technologies: Technology[];

  services: string[];

  features: string[];

  team: TeamPerson[];

  ico: IcoDetail[];
}
