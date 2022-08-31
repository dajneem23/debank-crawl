import { ProtectOpts, verifyAccessToken } from '@/api/middlewares/protect';
import { NewsStatus } from '@/types';
import { throwErr } from '@/utils/common';
import { RequestHandler } from 'express';
import { UserRole } from '..';
import { AuthError } from '../auth/auth.error';
import { getHighestRole } from '../auth/auth.utils';
const defaultOptions = {
  ignoreException: false,
};
type options = {
  ignoreException?: boolean;
  _action: string;
  _content: string;
};

export const ActionPermission: {
  [key: string]: any;
} = {
  'update:status': {
    [UserRole.USER]: {
      allowedValues: [NewsStatus.DRAFT, NewsStatus.PROCESSING, NewsStatus.PENDING],
      callback: function ({ status }: any) {
        return this.allowedValues.includes(status);
      },
    },
    [UserRole.ADMIN]: {
      allowedValues: [
        NewsStatus.DRAFT,
        NewsStatus.PENDING,
        NewsStatus.PROCESSING,
        NewsStatus.APPROVE,
        NewsStatus.PUBLISHED,
      ],
      callback: function ({ status }: any) {
        return this.allowedValues.includes(status);
      },
    },
  },
};

export const permission =
  ({ ignoreException = false, _action, _content }: options): RequestHandler =>
  async (req: any, res, next) => {
    try {
      req.auth = await verifyAccessToken(req.headers);
      req.auth.roles.includes(UserRole.SUPER)
        ? next()
        : ActionPermission[_action][getHighestRole(req.auth.roles)].callback(req[_content]) ||
          throwErr(new AuthError('PERMISSION_DENIED'));
      return next();
    } catch (err) {
      ignoreException ? next() : next(err);
    }
  };
