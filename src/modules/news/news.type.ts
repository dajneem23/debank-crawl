import { BaseModel } from '@/types';

export interface News extends BaseModel {
  slug: string;

  photos: string[];

  categories: string[];

  source: string;

  contents: Array<{
    title: string;
    summary: string;
    content: string;
    headings: Array<string>;
    lang: string;
  }>;
}
