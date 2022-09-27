import { BaseInformationModel } from '@/types/Common';

export interface Blockchain extends BaseInformationModel {
  name?: string;
  consensus?: string;
  _author?: string;
  launch_date?: Date;
  programmable?: boolean;
  private?: boolean;
  cryptocurrencies?: string[];
  version?: string;
  confirmations?: number;
  difficulty?: string;
  transactions?: number;
  height?: number;
  merkle_root?: string;
  nonce?: number;
  bits?: string;
  size?: number;
  fee?: number;
  hash?: string;
  mined_by?: string;
  block_reward?: string;
  uncles_reward?: string;
  gas_used?: string;
  gas_limit?: string;
  extra_data?: string;
  parent_hash?: string;
  sha3_uncles?: string;
  state_root?: string;
  timestamp?: Date;
  tvl?: string;
  total_accounts?: number;
  total_transactions?: number;
  total_contracts?: number;
  total_txns?: number;
  total_transfer_value?: number;
  trans?: {
    lang: string;
    about?: string;
    short_description?: string;
  }[];
}
export const _blockchain: Blockchain = {
  name: '',
  avatar: '',
  about: '',
  categories: [],
  cryptocurrencies: [],
  deleted: false,
  trans: [],
  created_at: new Date(),
  updated_at: new Date(),
};
