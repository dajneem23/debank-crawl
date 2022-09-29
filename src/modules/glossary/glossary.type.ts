import { BaseModel } from '@/types/Common';

export interface Glossary extends BaseModel {
  name: string;
  define: string;
  categories: string[];
  type?: string;
  trans: {
    define: string;
    name?: string;
    short_description?: string;
  }[];
}

export const _glossary: Glossary = {
  name: '',
  define: '',
  categories: [],
  trans: [],
};
