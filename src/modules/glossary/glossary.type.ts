import { BaseModel } from '@/types/Common';

export interface Glossary extends BaseModel {
  name: string;
  define: string;
}

// export const _glossary: Glossary = {
//   name: '',
//   define: '',
// };
