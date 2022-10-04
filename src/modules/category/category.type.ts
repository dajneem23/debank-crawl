import { BaseQuery, CATEGORY_TYPE } from '@/types/Common';
import { BaseModel } from '@/types/Common';

export interface Category extends BaseModel {
  // title
  title?: string;

  name?: string;

  sub_categories?: Category[];

  acronym?: string;
  // weight
  weight?: number;
  // type
  type?: CATEGORY_TYPE;

  sub_types?: string[];

  rank?: number;

  description?: string;

  source?: string;

  market_data?: {
    num_tokens: number;
    avg_price_change: number;
    market_cap: number;
    market_cap_change: number;
    volume: number;
    volume_change: number;
  };

  trans: {
    lang: string;
    title?: string;
    name?: string;
  }[];
}

export const _category: Category = {
  title: '',
  name: '',
  acronym: '',
  weight: 0,
  rank: 0,
  type: CATEGORY_TYPE.WIKIBLOCK,
  deleted: false,
  created_at: new Date(),
  updated_at: new Date(),
  trans: [],
  sub_categories: [],
};
