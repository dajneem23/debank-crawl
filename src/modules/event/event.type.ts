import { FindOperator } from 'typeorm';
export enum EventType {
  ONLINE = 'online',
  OFFLINE = 'offline',
  VIRTUAL = 'virtual',
}
import { Category } from '../category/category.type';
import { BaseQuery } from '@/types/Common';
import { CryptoAssetTagModel, CategoryModel, SponsorModel, SpeakerModel, CountryModel } from '@/models';
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

  categories?: CategoryModel[];

  cryptoAssetTags?: CryptoAssetTagModel[];

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

  trending?: boolean;

  categories: Category[];

  country: CountryModel;

  speakers: SpeakerModel[];

  sponsors: SponsorModel[];
}

export interface EventQuery extends BaseQuery {
  name?: string;

  startDate?: Date;

  endDate?: Date;

  category?: string;

  cryptoAssetTags?: string[];

  country?: string;

  speaker?: string;

  sponsor?: string;
}
