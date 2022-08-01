import { Request, Response } from 'express';
import { decodeToken } from '@/modules/user/user.util';
import { AuthError } from './auth.error';

export const authenticate = async (req: Request, res: Response, next: () => void) => {
  const { authorization } = req.headers;

  if (!authorization || !authorization.startsWith('Bearer')) {
    throw new AuthError('TOKEN_NOT_FOUND');
  }

  const split = authorization.split('Bearer ');
  if (split.length !== 2) {
    throw new AuthError('TOKEN_INVALID');
  }
  const accessToken = split[1];

  try {
    const data = await decodeToken(accessToken);

    if (!data) {
      throw new AuthError('TOKEN_INVALID');
    }

    res.locals = { ...res.locals, user: data };
    return next();
  } catch (err: any) {
    throw err;
  }
};
