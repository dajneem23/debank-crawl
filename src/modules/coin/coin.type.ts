import { BaseInformationModel, DEVELOPMENT_STATUS } from '@/types/Common';

export interface Coin extends BaseInformationModel {
  name: string;

  token_id: string;

  unique_key: string;

  blockchain: string;

  hash_algorithm: string;

  org_structure: string;

  explorer: string;

  white_paper: string;

  consensus: string;

  development_status: DEVELOPMENT_STATUS;

  open_source: boolean;

  hardware_wallet: boolean;
}
