import { BaseInformationModel, WorkType } from '@/types/Common';

export interface Person extends BaseInformationModel {
  name: string;

  first_name?: string;

  last_name?: string;

  position?: PersonPosition[];

  works?: PersonWork[];

  educations?: PersonEducation[];

  trans: {
    lang: string;
    about: string;
    short_description: string;
  }[];
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
export const _person: Person = {
  name: '',
  about: '',
  categories: [],
  position: [],
  works: [],
  educations: [],
  trans: [],
  verified: false,
  sponsored: false,
  avatar: '',
  short_description: '',
  deleted: false,
  created_at: new Date(),
  updated_at: new Date(),
};
