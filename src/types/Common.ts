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
}
export const trueSQL = '1 = 1';
