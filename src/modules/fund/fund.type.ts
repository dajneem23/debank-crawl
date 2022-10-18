import { BaseInformationModel, FundraisingRoundDetail, ForeignReLationship, COMPANY_TYPE } from '@/types/Common';
import { ObjectId } from 'mongodb';

export interface Fund extends BaseInformationModel {
  name: string;

  type?: COMPANY_TYPE;

  posts?: string[];

  cryptocurrencies?: string[];

  total_amount?: number;

  founders?: ForeignReLationship[];

  launched?: string;

  firms?: ForeignReLationship[];

  recent_investments?: ForeignReLationship[];

  current_roi?: number;

  ath_roi?: number;

  // total_investments?: number;

  investments?: ForeignReLationship[];

  funding?: number;

  typical_project?: string;

  typical_category?: string;

  tier?: number;

  rating?: number;

  assets_allocation?: string;

  trans: {
    lang: string;
    description: string;
    short_description?: string;
  }[];

  fees?: string;
}

export const _fund: Fund = {
  name: '',
  type: COMPANY_TYPE.NA,
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
