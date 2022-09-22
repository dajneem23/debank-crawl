import { BaseModel } from '@/types/Common';

export interface Glossary extends BaseModel {
  name: string;
  define: string;
  categories: string[];
}

export const _glossary: Glossary = {
  name: '',
  define: '',
  categories: [],
};
