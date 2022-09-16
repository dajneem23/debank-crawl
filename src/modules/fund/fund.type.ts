import { BaseInformationModel, FundraisingRoundDetail, ForeignReLationship } from '@/types/Common';
import { ObjectId } from 'mongodb';

export interface Fund extends BaseInformationModel {
  name: string;

  about?: string;

  type?: string;

  avatars?: string[];

  posts?: string[];

  cryptocurrencies?: string[];

  total_amount?: number;

  fundraising_rounds?: FundraisingRoundDetail[];

  partners?: ForeignReLationship[];

  firms?: ForeignReLationship[];

  recent_investments?: ForeignReLationship[];

  current_roi?: number;

  ath_roi?: number;

  total_investments?: number;

  investments?: ForeignReLationship[];

  funding?: number;

  typical_project?: string;

  typical_category?: string;

  tier?: number;

  rating?: number;

  assets_allocation?: string;
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
  total_investments: 0,
  investments: [],
  partners: [],
  firms: [],
  metadata: {},
  deleted: false,
  created_at: new Date(),
  updated_at: new Date(),
};
