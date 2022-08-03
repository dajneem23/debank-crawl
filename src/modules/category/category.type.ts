import { CATEGORY_TYPE } from '@/types/Common';
import { FindOperator } from 'typeorm';

export interface Category {
  // Keyword ID
  id?: string;
  // title
  title?: string;
  // weight
  weight?: number;
  // type
  type?: CATEGORY_TYPE;
  // createdAt
  createdAt?: Date | FindOperator<Date>;
  updatedAt?: Date | FindOperator<Date>;
}
export type CategoryParams = {
  id: string;
};
