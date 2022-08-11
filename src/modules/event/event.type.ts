import { BaseInformationModel, EventType, Agenda, BaseQuery } from '@/types/Common';

export interface Event extends BaseInformationModel {
  // id - primary id unique

  type?: EventType;

  trending?: true;

  significant?: true;

  name?: string;

  introduction?: string;

  email?: string;

  agendas?: Array<Agenda>;

  location?: object; // Map API

  start_date?: Date;

  end_date?: Date;

  categories?: Array<string>;

  country?: string;

  //array id of persons
  speakers?: Array<string>;

  //array id of persons
  sponsors?: Array<string>;
}
export interface EventQuery extends BaseQuery, EventFilter {
  name?: string;

  start_date?: Date;

  end_date?: Date;

  category?: string;

  cryptoAssetTags?: string[];

  country?: string;

  speaker?: string;

  sponsor?: string;
}
export interface EventFilter {
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
  _id?: string;
  newEvent?: Event;
  updateEvent?: Event;
  filter?: EventQuery;
  query?: BaseQuery;
  subject?: string;
};

export type EventOutput = {
  code?: number;
  result?: Event | any;
  total_count?: number;
  data?: Array<Event>;
};
