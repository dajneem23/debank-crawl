import { BaseInformationModel, WorkType } from '@/types/Common';

export interface Person extends BaseInformationModel {
  position?: PersonPosition[];

  // works?: PersonWork[];

  countries?: string[];

  work_experiences?: WorkExperience[];

  educations?: PersonEducation[];

  trans: {
    lang: string;
    about: string;
    short_description: string;
  }[];
}

export type PersonPosition = {
  name?: string;
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
export type WorkExperience = {
  title: string; // position title
  company_id: string; // linked to company collection
  description: string;
  company_name: string;
  date_start?: Date;
  date_end?: Date;
  is_current_work?: boolean; // forced current works for the company
};
export type PersonEducation = {
  name?: string;
  description?: string;
  from_time?: Date;
  to_time?: Date;
};
export const _person: Person = {
  name: '',
  categories: [],
  position: [],
  work_experiences: [],
  educations: [],
  trans: [],
  avatar: '',
  short_description: '',
  deleted: false,
  created_at: new Date(),
  updated_at: new Date(),
};
