import { FindOperator } from 'typeorm';
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
import { CryptoAssetTag } from '../cryptoAssetTag/cryptoAssetTag.type';
import { CryptoAssetTagModel } from '@/models/crypto_asset_tag.model';
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

  trending?: boolean;

  significant?: boolean;

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

  location?: string;

  trending?: boolean;

  significant?: boolean;

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

  location?: string;

  significant?: boolean;

  country?: string;

  speaker?: string;

  sponsor?: string;
}
