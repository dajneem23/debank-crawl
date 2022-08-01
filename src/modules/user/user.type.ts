import { BaseQuery } from '@/types/Common';

export type AuthResponse = {
  accessToken: string;
  refreshToken?: string;
};
export type AuthRequest = {
  email: string;
  password: string;
};
export type UserResponse = {
  name?: string;
  email?: string;
  language?: string;
  translation_source_languages?: string;
  translation_target_languages?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  about?: string;
  location?: string;
  website?: string;
  avatar?: string;
  role?: Role;
  roleId?: string;
};
export type Role = {
  id: string;
  code: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
};
export type UserRequest = {
  id?: string;
  name?: string;
  email?: string;
  password?: string;
  language?: string;
  translation_source_languages?: string;
  translation_target_languages?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  about?: string;
  location?: string;
  website?: string;
  avatar?: string;
  role_id?: string;
};

export interface UserQuery extends BaseQuery {
  id?: string;
  name?: string;
  email?: string;
  password?: string;
  language?: string;
  translation_source_languages?: string;
  translation_target_languages?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  about?: string;
  location?: string;
  website?: string;
  avatar?: string;
  role_id?: string;
}
export type UserParams = {
  id: string;
};

export type SubscribeRequest = {
  categories: Array<string>;
};
