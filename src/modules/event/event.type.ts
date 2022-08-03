import { FindOperator } from 'typeorm';

export enum EventCategory {
  WORKSHOP = 'workshop',
  EVENT_OR_MEETUP = 'event_or_meetup',
  CONFERENCE = 'conference',
  HACKATHON = 'hackathon',
  DRINK_AND_PARTY = 'drink_and_party',
}

export enum EventType {
  ONLINE = 'online',
  OFFLINE = 'offline',
  VIRTUAL = 'virtual',
}
import { CategoryModel } from '@/models/category.model';
import { CountryModel } from '@/models/country.model';
import { SpeakerModel } from '@/models/speaker.model';
import { SponsorModel } from '@/models/sponsor.model';
import { Category } from '../category/category.type';
import { BaseQuery } from '@/types/Common';
export interface Event {
  id?: string;

  name?: string;

  introduction?: string;

  medias?: object; //    media

  agenda?: object; //    agenda

  socialProfiles?: object; //   Social Profile

  map?: object; // Map API

  startDate?: Date;

  endDate?: Date;

  phone?: string;

  website?: string;

  location?: string;

  categories?: CategoryModel[];

  country?: CountryModel;

  speakers?: SpeakerModel[];

  sponsors?: SponsorModel[];

  createdAt?: Date | FindOperator<Date>;

  updatedAt?: Date | FindOperator<Date>;
}
export interface EventResponse {
  id?: string;

  name: string;

  introduction: string;

  medias?: object; //    media

  agenda?: object; //    agenda

  socialProfiles?: object; //   Social Profile

  map?: object; // Map API

  startDate: Date;

  endDate: Date;

  phone?: string;

  website?: string;

  location?: string;

  categories: Category[];

  country: CountryModel;

  speakers: SpeakerModel[];

  sponsors: SponsorModel[];
}

export interface EventQuery extends BaseQuery {
  id: string;

  name: string;

  introduction: string;

  media?: string;

  agenda?: string;

  socialProfile?: string;

  map?: string;

  startDate?: Date;

  endDate?: Date;

  phone?: string;

  website?: string;

  location?: string;

  category: string;

  country?: string;

  speaker?: string;

  sponsor?: string;
}
