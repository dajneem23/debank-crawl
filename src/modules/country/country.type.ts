import { BaseModel } from '@/types/Common';

export interface Country extends BaseModel {
  name: string;

  code: string;
}
