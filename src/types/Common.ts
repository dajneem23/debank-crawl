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
  NEWS = 'news',
  RELATED_NEWS = 'related_news',
  BLOCKCHAIN = 'blockchain',
  APPLICATION = 'application',
  CONSENSUS = 'consensus',
  CRYPTO_ASSET = 'crypto_asset',
  PERSON = 'person',
  PRODUCT = 'product',
  COMPANY = 'company',
  CRYPTO = 'crypto',
  EXPLORATION = 'exploration',
  SUB_EXPLORATION = 'sub_exploration',
}
export type BaseModel = {
  _id?: string;

  updated_by?: string;

  updated_at?: Date;

  created_by?: string;

  created_at?: Date;

  deleted_by?: string;

  deleted_at?: Date;

  deleted?: boolean;
};

export interface BaseInformationModel extends BaseModel {
  verified?: boolean;

  sponsored?: boolean;

  tel?: string;

  email?: string;

  avatar?: string;

  about?: string;

  short_description?: string;

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

  gitter?: string;

  bitcoin_talk?: string;

  rocket_chat?: string;
}

export type Feature = {
  title: string;
  description: string;
};

export type Service = {
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
export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
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
export type BaseServiceInput = {
  _id?: string;
  _content: {
    [key: string]: any;
  };
  _subject?: string;
  _query?: {
    page?: number;
    per_page?: number;
    sort_by?: string;
    sort_order?: 'desc' | 'asc';
  };
  _filter?: {
    q: string;
    [key: string]: any;
  };
};

export type BaseServiceOutput = {
  code?: number;
  result?: Event | any;
  total_count?: number;
  data?: Array<any>;
};

export type TeamPerson = {
  name: string;
  position: string;
  contacts?: Array<{
    name: string;
    url: string;
  }>;
};
export type Support = {
  name: string;
  url: string;
};
export type ResearchPaper = {
  title: string;
  url: string;
};

export type Technology = {
  blockchain?: string;
  hash_algorithm?: string;
  consensus?: string;
  'org._structure'?: string;
  open_source?: string;
  hardware_wallet?: string;
  development_status?: string;
};
export type IcoDetail = {
  investor_supply?: string;
  total_supply?: string;
  hard_cap?: string;
  start_date?: string;
  end_date?: string;
};

export type ProductInfomation = {
  'Parent Company'?: string;
  'Team Location'?: string;
  Blockchain?: string;
  Token?: string;
  Release?: string;
  'Software License'?: string;
};
export type App = {
  name: string;
  url: string;
};
export type Media = {
  type: string;
  url: string;
};
