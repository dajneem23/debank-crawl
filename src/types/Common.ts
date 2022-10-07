import { UserRole } from '@/modules';
import { ObjectIdPattern } from '@/utils/common';
import { Joi } from 'celebrate';
import { ObjectId } from 'mongodb';

export interface BaseQuery {
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'desc' | 'asc';
  q?: string;
}

export type PaginationResult<T> = { total_count: number; items: T[] };

export type T = any;

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
  INVESTOR = 'investor',
}
export type BaseModel = {
  _id?: string;

  foreign_id?: string;

  record_id?: string;

  metadata?: {
    _admin_note?: string;
    storage?: string;
  };

  need_review?: boolean;

  review_status?: string;

  reviewed?: boolean;

  updated_by?: string;

  updated_at?: Date;

  created_by?: string;

  created_at?: Date;

  deleted_by?: string;

  deleted_at?: Date;

  deleted?: boolean;
};

export interface BaseInformationModel extends BaseModel {
  id?: ObjectId;

  name?: string;

  slug?: string;

  about?: string;

  categories?: ObjectId[];

  verified?: boolean;

  sponsored?: boolean;

  tel?: string;

  email?: string;

  avatar?: string;

  short_description?: string;

  description?: string;

  urls?: {
    twitter?: string[];

    telegram?: string[];

    facebook?: string[];

    instagram?: string[];

    linkedin?: string[];

    github?: string[];

    medium?: string[];

    discord?: string[];

    youtube?: string[];

    website?: string[];

    blog?: string[];

    reddit?: string[];

    gitter?: string[];

    bitcoin_talk?: string[];

    rocket_chat?: string[];

    stack_exchange: string[];

    video?: string[];

    fee?: string;

    slack?: string[];

    explorer?: string[];

    whitepaper?: string[];

    other?: string[];
  };

  recent_tweets?: any[];
}

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
  _name?: string;
  _slug?: string;
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
  _permission?: 'public' | 'private';
  _role?: UserRole;
};

export type BaseServiceOutput = {
  code?: number;
  result?: any;
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

export type ProductInformation = {
  parent_company?: string;
  team_location?: string;
  blockchain?: string;
  token?: string;
  release?: string;
  software_license?: string;
};
export type App = {
  name: string;
  url: string;
};
export type Media = {
  type: string;
  url: string;
};

export enum LANG_CODE {
  VI = 'vi',
  // EN = 'en',
  FR = 'fr',
  DE = 'de',
  CN = 'cn',
  JP = 'jp',
}

export const PRIVATE_KEYS = [
  'updated_at',
  'created_at',
  'deleted_at',
  'deleted_by',
  'updated_by',
  'created_by',
  'deleted',
  'trans',
];
export type ForeignReLationship = {
  name?: string;
  foreign_id: string;
  type?: string;
  [key: string]: any;
};
export enum NewsStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVE = 'approve',
  PROCESSING = 'processing',
  PUBLISHED = 'published',
}
export enum FundraisingRound {
  UNKNOWN = 'Unknown',
  PRE_SEED = 'Pre-Seed',
  SEED = 'Seed',
  ANGEL = 'Angel',
  INVESTORS = 'Investors',
  BRIDGE = 'Bridge',
  MEZZABINE = 'Mezzanine',
  PRE_PUBLIC = 'Pre-Public',
  PUBLIC = 'Public',
  SERIES_A = 'Series A',
  SERIES_B = 'Series B',
  SERIES_C = 'Series C',
  SERIES_D = 'Series D',
  SERIES_E = 'Series E',
  SERIES_F = 'Series F',
}
export enum FUND_TYPE {
  NA = 'N/A',
  CRYPTO_VENTURE = 'Crypto Venture',
  EXCHANGE_FUND = 'Exchange Fund',
  DEVELOPER_SUPPORT = 'Developer Support',
  MARKETING_SUPPORT = 'Marketing Support',
  SECURITY_SUPPORT = 'Security Support',
  PROJECT_BASED = 'Project Based',
  NON_CRYPTO_CAPITAL = 'Non-Crypto Capital',
}
export type FundraisingRoundDetail = {
  round_name: string;
  valuation?: string;
  description?: string;
  announcement?: string;
  amount?: number;
  anum?: string;
  number_of_rounds?: string;
  record_id?: string;
  stage: FundraisingRound | string;
  posts?: string[];
  date: Date;
};
export enum COLLECTION_NAMES {
  events = 'events',
  news = 'news',
  projects = 'projects',
  persons = 'persons',
  companies = 'companies',
  organizations = 'organizations',
  funds = 'funds',
  users = 'users',
  categories = 'categories',
  tags = 'tags',
  verifications = 'verifications',
  glossaries = 'glossaries',
  blockchains = 'blockchains',
  products = 'products',
  countries = 'countries',
  'auth-sessions' = 'auth-sessions',
  coins = 'coins',
  settings = 'settings',
  exchanges = 'exchanges',
}

export enum coinSortBy {
  'usd_price' = 'market_data.USD.price',
  'usd_market_cap' = 'market_data.USD.market_cap',
  'usd_market_cap_dominance' = 'market_data.USD.market_cap_dominance',
  'usd_volume_24h' = 'market_data.USD.volume_24h',
  'usd_volume_change_24h' = 'market_data.USD.volume_change_24h',
  'usd_percent_change_24h' = 'market_data.USD.percent_change_24h',
  'usd_percent_change_7d' = 'market_data.USD.percent_change_7d',
  'usd_percent_change_30d' = 'market_data.USD.percent_change_30d',
  'usd_percent_change_60d' = 'market_data.USD.percent_change_60d',
  'usd_percent_change_90d' = 'market_data.USD.percent_change_90d',
  'usd_tvl' = 'market_data.USD.tvl',
  'created_at' = 'created_at',
}

export enum TopNewsDateRange {
  '1d' = '1',
  '7d' = '7',
  '30d' = '30',
  '90d' = '90',
  '180d' = '180',
}

export enum BACKER {
  STRONG = 'strong',
  MEDIUM = 'medium',
  WEAK = 'weak',
  NEUTRAL = 'neutral',
  EARLY = 'early',
}
/**
 *  @description convert currency to market cap convert_id
 *  @see https://coinmarketcap.com/api/documentation/v1/#section/Standards-and-Conventions
 */
export enum CONVERT_CURRENCY_CODE {
  'USD' = '2781',
  'ALL' = '3526',
  'DZD' = '3537',
  'ARS' = '2821',
  'AMD' = '3527',
  'AUD' = '2782',
  'AZN' = '3528',
  'BHD' = '3531',
  'BDT' = '3530',
  'BYN' = '3533',
  'BMD' = '3532',
  'BOB' = '2832',
  'BAM' = '3529',
  'BRL' = '2783',
  'BGN' = '2814',
  'KHR' = '3549',
  'CAD' = '2784',
  'CLP' = '2786',
  'CNY' = '2787',
  'COP' = '2820',
  'CRC' = '3534',
  'HRK' = '2815',
  'CUP' = '3535',
  'CZK' = '2788',
  'DKK' = '2789',
  'DOP' = '3536',
  'EGP' = '3538',
  'EUR' = '2790',
  'GEL' = '3539',
  'GHS' = '3540',
  'GTQ' = '3541',
  'HNL' = '3542',
  'HKD' = '2792',
  'HUF' = '2793',
  'ISK' = '2818',
  'INR' = '2796',
  'IDR' = '2794',
  'IRR' = '3544',
  'IQD' = '3543',
  'ILS' = '2795',
  'JMD' = '3545',
  'JPY' = '2797',
  'JOD' = '3546',
  'KZT' = '3551',
  'KES' = '3547',
  'KWD' = '3550',
  'KGS' = '3548',
  'LBP' = '3552',
  'MKD' = '3556',
  'MYR' = '2800',
  'MUR' = '2816',
  'MXN' = '2799',
  'MDL' = '3555',
  'MNT' = '3558',
  'MAD' = '3554',
  'MMK' = '3557',
  'NAD' = '3559',
  'NPR' = '3561',
  'TWD' = '2811',
  'NZD' = '2802',
  'NIO' = '3560',
  'NGN' = '2819',
  'NOK' = '2801',
  'OMR' = '3562',
  'PKR' = '2804',
  'PAB' = '3563',
  'PEN' = '2822',
  'PHP' = '2803',
  'PLN' = '2805',
  'GBP' = '2791',
  'QAR' = '3564',
  'RON' = '2817',
  'RUB' = '2806',
  'SAR' = '3566',
  'RSD' = '3565',
  'SGD' = '2808',
  'ZAR' = '2812',
  'KRW' = '2798',
  'SSP' = '3567',
  'VES' = '3573',
  'LKR' = '3553',
  'SEK' = '2807',
  'CHF' = '2785',
  'THB' = '2809',
  'TTD' = '3569',
  'TND' = '3568',
  'TRY' = '2810',
  'UGX' = '3570',
  'UAH' = '2824',
  'AED' = '2813',
  'UYU' = '3571',
  'UZS' = '3572',
  'VND' = '2823',
}
/**
 *
 */
export enum TIME_PERIOD {
  '1h' = '1h',
  '24h' = '24h',
  '7d' = '7d',
  '14d' = '14d',
  '30d' = '30d',
  '60d' = '60d',
  '90d' = '90d',
  '180d' = '180d',
  '365d' = '365d',
  'yesterday' = 'yesterday',
  'all_time' = 'all_time',
}

/**
 *  @description - Remove all special characters from a string to make it a valid URL
 */
export const RemoveSlugPattern = /[`~!@#$%^&*()+{}[\]\\|,.//?;':"]/g;

export const urlsValidation = Joi.object({
  twitter: Joi.array().items(Joi.string()),

  telegram: Joi.array().items(Joi.string()),

  facebook: Joi.array().items(Joi.string()),

  instagram: Joi.array().items(Joi.string()),

  linkedin: Joi.array().items(Joi.string()),

  github: Joi.array().items(Joi.string()),

  medium: Joi.array().items(Joi.string()),

  youtube: Joi.array().items(Joi.string()),

  website: Joi.array().items(Joi.string()),

  blog: Joi.array().items(Joi.string()),

  rocket_chat: Joi.array().items(Joi.string()),

  bitcoin_talk: Joi.array().items(Joi.string()),

  galleries: Joi.array().items(Joi.string()),

  stack_exchange: Joi.array().items(Joi.string()),
});
/**
 * @description - id validation
 */
export const ObjectIdValidation = Joi.string()
  .pattern(new RegExp(ObjectIdPattern))
  .message('id must be a valid ObjectId');
