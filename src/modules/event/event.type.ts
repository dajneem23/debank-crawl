import { BaseInformationModel, EventType, Sponsor, Agenda } from '@/types/Common';

export interface Event extends BaseInformationModel {
  // id - primary id unique

  type: EventType;

  name: string;

  introduction: string;

  agenda: Array<Agenda>;

  location: object; // Map API

  startDate: Date;

  endDate: Date;

  phone: string;

  categories?: Array<string>;

  country?: string;

  //array id of persons
  speakers: Array<string>;

  //array id of persons
  sponsors: Array<Sponsor>;
}
