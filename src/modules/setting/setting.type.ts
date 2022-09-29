import { BaseModel } from '@/types/Common';

export interface Setting extends BaseModel {
  name?: string;

  weight?: number;
  // type
  type?: string;

  content: any;
}
