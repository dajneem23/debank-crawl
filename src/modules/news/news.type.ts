import { BaseModel, NewsStatus } from '@/types';
import { Company } from '../company';

export interface News extends BaseModel {
  slug: string;

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

  company_tags: string[];

  coin_tags: string[];

  product_tags: string[];

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
  company_tags: [],
  coin_tags: [],
  product_tags: [],
  stars: 0,
  number_relate_article: 0,
  trans: [],
  deleted: false,
  created_at: new Date(),
  updated_at: new Date(),
};
