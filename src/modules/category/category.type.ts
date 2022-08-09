import { CATEGORY_TYPE } from '@/types/Common';
import { BaseModel } from '@/types/Common';

export interface Category extends BaseModel {
  // title
  title?: string;
  // weight
  weight?: number;
  // type
  type?: CATEGORY_TYPE;
  // createdAt
}
export type CategoryParams = {
  id: string;
};
