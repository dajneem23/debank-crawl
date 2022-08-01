import { isNil, omit, omitBy, pick } from 'lodash';
import { UserResponse } from '@/modules/user/user.type';
import * as jwt from 'jsonwebtoken';
import { promisify } from 'util';
import env from '@/config/env';

const sign = promisify(jwt.sign).bind(jwt);

export const toResponseUserList = (userList: Array<UserResponse>) => {
  return userList.map((item: UserResponse) => {
    const select = ['role'];
    return omitBy({ ...pick(item.role, select), ...omit(item, ['password']) }, isNil);
  });
};

export const toResponseUser = async (data: UserResponse) => {
  return omitBy(omit({ ...data }, ['password']), isNil);
};

export const generateToken = async (payload: UserResponse) => {
  try {
    return await sign(pick(payload, ['id', 'name', 'email', 'role_id', 'language']), env.ACCESS_TOKEN_SECRET, {
      algorithm: 'HS256',
      expiresIn: env.ACCESS_TOKEN_LIFE,
    });
  } catch (error) {
    return null;
  }
};

export const decodeToken = async (token: string) => {
  try {
    return await jwt.verify(token, env.ACCESS_TOKEN_SECRET);
  } catch (error) {
    return null;
  }
};
