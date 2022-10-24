import { RequestHandler } from 'express';
import { throwErr } from '@/utils/common';
import { AuthError } from '@/modules/auth/auth.error';
import AuthService from '@/modules/auth/auth.service';
import { IncomingHttpHeaders } from 'http';
import { Container } from 'typedi';
import BlocklistService from '@/modules/auth/blocklist.service';
import { UserRole } from '@/modules';

export type ProtectOpts = {
  ignoreException: boolean;
};

const defaultOpts: ProtectOpts = {
  ignoreException: false,
};

/**
 * Detect and verify access token
 */
export const verifyAccessToken = async (headers: IncomingHttpHeaders) => {
  const blocklistService = Container.get(BlocklistService);

  // Detect token
  const accessToken = headers.authorization?.replace('Bearer ', '');
  if (!accessToken) throwErr(new AuthError('NO_TOKEN_PROVIDED'));
  // Verify token
  const decoded = AuthService.verifyBearerTokens(accessToken);
  // Check blocklist
  if (await blocklistService.isOnTemporaryBlockList(decoded.id)) {
    throwErr(new AuthError('ACCESS_TOKEN_EXPIRED'));
  }
  return decoded;
};

/**
 * Authentication middleware
 */
export const protect =
  ({ ignoreException }: ProtectOpts = defaultOpts): RequestHandler =>
  async (req, res, next) => {
    try {
      req.auth = await verifyAccessToken(req.headers);
      return next();
    } catch (err) {
      if (ignoreException) return next();
      return next(err);
    }
  };

/**
 * [Private] Authentication middleware
 * @returns RequestHandler
 */
export const protectPrivateAPI = async function (req: any, res: any, next: any): Promise<RequestHandler> {
  try {
    const decoded = await verifyAccessToken(req.headers);
    if (!decoded?.roles?.includes(UserRole.ADMIN)) {
      throwErr(new AuthError('PERMISSION_DENIED'));
    }
    req.auth = decoded;
    return next();
  } catch (err) {
    return next(err);
  }
};
