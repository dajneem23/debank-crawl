import { BaseModel, NewsStatus } from '@/types';

export interface News extends BaseModel {
  slug: string;

  minute_read: number;

  title: string;

  status: NewsStatus;

  summary: string;

  content: string;

  headings: string[];

  photos: string[];

  categories: string[];

  source: string;

  views: number;

  keywords: string[];

  comments: string[];

  company_tags: string[];

  coin_tags: string[];

  product_tags: string[];

  person_tags: string[];

  event_tags: string[];

  fund_tags: string[];

  stars: number;

  number_relate_article?: number;

  trans: Array<{
    lang: string;
    title: string;
    slug: string;
    summary: string;
    content: string;
    headings: string[];
  }>;
}
export const _news: News = {
  minute_read: 0,
  slug: '',
  status: NewsStatus.DRAFT,
  title: '',
  summary: '',
  content: '',
  headings: [],
  photos: [],
  categories: [],
  source: '',
  views: 0,
  keywords: [],
  coin_tags: [],
  company_tags: [],
  product_tags: [],
  person_tags: [],
  comments: [],
  event_tags: [],
  fund_tags: [],
  stars: 0,
  number_relate_article: 0,
  trans: [],
  deleted: false,
  created_at: new Date(),
  updated_at: new Date(),
};
