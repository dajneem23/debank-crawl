import { BaseModel } from '@/types/Common';

export interface Glossary extends BaseModel {
  name: string;
  define: string;
  categories: string[];
  trans: {
    lang: string;
    about?: string;
    short_description?: string;
  }[];
}

export const _glossary: Glossary = {
  name: '',
  define: '',
  categories: [],
  trans: [],
};
