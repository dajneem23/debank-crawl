export interface BaseQuery {
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'desc' | 'asc';
  q?: string;
}

export type PaginationResult<T> = { total_count: number; items: T[] };

export type CurrencyCode = 'VND' | 'USD';

export enum LANGUAGE_CODE {
  VI = 'vi',
  EN = 'en',
  FR = 'fr',
  DE = 'de',
}

export enum ORDER {
  DESC = 'DESC',
  ASC = 'ASC',
}

export enum USER_STATUS {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum CRAWL_CONTENT_STATUS {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum CONTENT_TYPE {
  WEB = 'web',
  TELEGRAM = 'telegram',
  TWITTER = 'twitter',
  PROJECT = 'project',
}
export type HeaderParams = {
  'x-uid': string;
};

export enum CATEGORY_TYPE {
  LISTENING = 'listening',
  WIKIBLOCK = 'wikiblock',
  EVENT = 'event',
  CRYPTO_ASSET = 'crypto_asset',
  PERSON = 'person',
}
export type BaseModel = {
  _id?: string;

  created_by?: string;

  updated_by?: string;

  deleted_by?: string;

  deleted_at?: Date;

  deleted?: boolean;

  // Record created at
  created_at?: Date;
  // Record updated at
  updated_at?: Date;
};

export type BaseInformationModel = {
  _id?: string;

  verified?: boolean;

  tel?: string;

  email?: string;

  avatar?: string;

  about?: string;

  twitter?: string;

  telegram?: string;

  facebook?: string;

  instagram?: string;

  linkedin?: string;

  github?: string;

  medium?: string;

  youtube?: string;

  website?: string;

  blog?: string;
  reddit?: string;

  created_by?: string;

  updated_by?: string;

  deleted_by?: string;

  deleted_at?: Date;

  deleted?: boolean;

  // Record created at
  created_at?: Date;
  // Record updated at
  updated_at?: Date;
};

export type Feature = {
  title: string;
  description: string;
};

export type Service = {
  title: string;
  description: string;
};

export type Gallery = {
  name: string;
  url: string;
};

export type CCY = {
  title: string;
  description: string;
};

export enum WorkType {
  CURRENT = 'current',
  PREVIOUS = 'previous',
}

export enum DEVELOPMENT_STATUS {
  WORKING_PRODUCT = 'working_product',
  ON_GOING_DEVELOPMENT = 'on_going_development',
  ALPHA_VERSION = 'alpha_version',
  BETA_VERSION = 'beta_version',
  DEFUNCT = 'defunct',
  UNKNOWN = 'unknown',
  PROTOTYPE_MVP = 'prototype_mvp',
}

export type ContractAddress = {
  owner: string;
  address?: string;
  url?: string;
};
export enum EventType {
  ONLINE = 'online',
  OFFLINE = 'offline',
  VIRTUAL = 'virtual',
}
export enum SponsorType {
  COMPANY = 'company',
  PERSON = 'person',
}
export type Sponsor = {
  id: string;
  name?: string;
  type?: SponsorType;
};
export type Agenda = {
  time?: Date;
  description?: string;
};

export const defaultFilter = {
  deleted: false,
};
