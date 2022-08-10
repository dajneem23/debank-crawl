import { BaseModel } from '@/types/Common';
export interface Team extends BaseModel {
  name: string;

  members: Array<string>;

  location: string;
}
