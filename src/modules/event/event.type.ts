import { BaseInformationModel, EventType, Sponsor, Agenda, BaseQuery } from '@/types/Common';

export interface Event extends BaseInformationModel {
  // id - primary id unique

  type?: EventType;

  name?: string;

  introduction?: string;

  email?: string;

  agenda?: Array<Agenda>;

  location?: object; // Map API

  start_date?: Date;

  end_date?: Date;

  categories?: Array<string>;

  country?: string;

  //array id of persons
  speakers?: Array<string>;

  //array id of persons
  sponsors?: Array<Sponsor>;
}
export interface EventQuery extends BaseQuery {
  name?: string;

  start_date?: Date;

  end_date?: Date;

  category?: string;

  cryptoAssetTags?: string[];

  country?: string;

  speaker?: string;

  sponsor?: string;
}

export type EventInput = {
  newEvent?: Event;
  updateEvent?: { data: Event; id: string };
};

export type EventOutput = {
  code: number;
  result?: Event | any;
  totalCount?: number;
  data?: Array<Event>;
};
