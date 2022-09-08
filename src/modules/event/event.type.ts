import { BaseInformationModel, EventType, Agenda, BaseQuery, Media } from '@/types/Common';
import { ObjectId } from 'mongodb';

export interface Event extends BaseInformationModel {
  // id - primary id unique

  type?: EventType | any;

  trending?: boolean;

  significant?: boolean;

  name?: string;

  introduction?: string;

  email?: string;

  agendas?: Array<Agenda>;

  location?: object; // Map API

  start_date?: Date;

  end_date?: Date;

  country?: string;

  //array id of persons
  speakers?: ObjectId[];

  //array id of persons
  sponsors?: ObjectId[];

  subscribers?: string[];

  slide?: string;

  recap?: string;

  banners?: string[];

  media?: Media[];
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
  data?: Event[];
};
export const _event: Event = {
  type: '',
  trending: false,
  significant: false,
  name: '',
  introduction: '',
  email: '',
  agendas: [],
  location: {},
  start_date: new Date(),
  end_date: new Date(),
  categories: [],
  country: '',
  speakers: [],
  sponsors: [],
  subscribers: [],
  slide: '',
  recap: '',
  banners: [],
  media: [],
  deleted: false,
  created_at: new Date(),
  updated_at: new Date(),
};
