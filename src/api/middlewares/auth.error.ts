import httpStatusCode from 'http-status';
import AppError, { AppErrorJSON } from '@/core/errors/AppError';

export const errors = Object.freeze({
  TOKEN_NOT_FOUND: {
    message: 'Token not found',
    code: '1001',
    status: httpStatusCode.NOT_FOUND,
    isPublic: true,
    locales: {
      vi: 'Token không tồn tại',
      en: 'Token not found',
    },
  },
  TOKEN_INVALID: {
    message: 'Token is invalid',
    code: '1002',
    status: httpStatusCode.UNPROCESSABLE_ENTITY,
    isPublic: true,
    locales: {
      vi: 'Token không đúng',
      en: 'Token is invalid',
    },
  },
  TOKEN_EXPIRED: {
    message: 'Token is expired',
    code: '1002',
    status: httpStatusCode.UNAUTHORIZED,
    isPublic: true,
    locales: {
      vi: 'Token hết hạn',
      en: 'Token is expired',
    },
  },
  PERMISSION_DENIED: {
    message: 'Permission denied!',
    code: '1002',
    status: httpStatusCode.NOT_ACCEPTABLE,
    isPublic: true,
    locales: {
      vi: 'Truy cập ko được phép',
      en: 'Permission denied!',
    },
  },
});

export class AuthError extends AppError {
  constructor(msg: keyof typeof errors, errDetails?: AppErrorJSON['details']) {
    super({ ...errors[msg], ...(errDetails && { details: errDetails }) });
  }
}
