import { BaseInformationModel, WorkType } from '@/types/Common';

export interface Person extends BaseInformationModel {
  name: string;

  categories?: Array<string>;

  position?: Array<PersonPosition>;

  work?: Array<PersonWork>;

  educations?: Array<PersonEducation>;
}

export type PersonPosition = {
  title?: string;
  description?: string;
};
export type PersonWork = {
  title?: string;
  description?: string;
  company?: string;
  position?: string;
  date_start?: Date;
  date_end?: Date;
  type?: WorkType;
};
export type PersonEducation = {
  title?: string;
  description?: string;
};
