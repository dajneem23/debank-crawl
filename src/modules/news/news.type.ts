import { BaseModel } from '@/types';
import { Company } from '../company';

export interface News extends BaseModel {
  slug: string;

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

  contents: Array<{
    slug: string;
    title: string;
    summary: string;
    content: string;
    headings: string[];
    lang: string;
  }>;
}
export const _news: News = {
  slug: '',
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
  contents: [],
  deleted: false,
  created_at: new Date(),
  updated_at: new Date(),
};
