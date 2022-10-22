import { BaseInformationModel, COMPANY_TYPE } from '@/types/Common';
import { ObjectId } from 'mongodb';

export interface Fund extends BaseInformationModel {
  name: string;

  posts?: string[];

  cryptocurrencies?: string[];

  total_amount?: number;

  founders?: string[];

  launched?: string;

  firms?: string[];

  recent_investments?: string[];

  current_roi?: number;

  ath_roi?: number;

  // total_investments?: number;

  investments?: string[];

  funding?: number;

  typical_project?: string;

  typical_category?: string;

  tier?: number;

  rating?: number;

  assets_allocation?: string;

  funding_rounds?: string[];

  trans: {
    lang: string;
    description: string;
    short_description?: string;
  }[];

  fees?: string;
}

export const _fund: Fund = {
  name: '',
  categories: [],
  posts: [],
  cryptocurrencies: [],
  // total_investments: 0,
  investments: [],
  founders: [],
  firms: [],
  deleted: false,
  trans: [],
  updated_at: new Date(),
  created_at: new Date(),
};
