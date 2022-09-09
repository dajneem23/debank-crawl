import { BaseInformationModel, FundraisingRoundDetail, ForeignReLationship } from '@/types/Common';
import { ObjectId } from 'mongodb';

export interface Fund extends BaseInformationModel {
  name: string;

  description?: string;

  type?: string;

  avatars?: string[];

  posts?: string[];

  cryptocurrencies?: string[];

  total_amount?: number;

  fundraising_rounds?: FundraisingRoundDetail[];

  partners?: ForeignReLationship[];

  firms?: ForeignReLationship[];
}

export const _fund: Fund = {
  name: '',
  type: '',
  categories: [],
  avatars: [],
  avatar: '',
  about: '',
  posts: [],
  total_amount: 0,
  cryptocurrencies: [],
  fundraising_rounds: [],
  partners: [],
  firms: [],
  metadata: {},
  deleted: false,
  created_at: new Date(),
  updated_at: new Date(),
};
