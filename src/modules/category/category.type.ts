import { BaseQuery, CATEGORY_TYPE } from '@/types/Common';
import { BaseModel } from '@/types/Common';

export interface Category extends BaseModel {
  // title
  title?: string;

  name?: string;

  acronym?: string;
  // weight
  weight?: number;
  // type
  type?: CATEGORY_TYPE;
}
export type CategoryParams = {
  id: string;
};
export interface CategoryFilter extends BaseQuery {
  name?: string;
  title?: string;
  weight?: number;
  type?: CATEGORY_TYPE;
}
export type CategoryInput = {
  _id?: string;
  _category?: Category;
  _subject?: string;
  _query?: BaseQuery;
  _filter?: CategoryFilter;
};

export type CategoryOutput = {
  code?: number;
  result?: Event | any;
  total_count?: number;
  data?: Array<Category>;
};
