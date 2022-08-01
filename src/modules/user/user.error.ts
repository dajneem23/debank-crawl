import httpStatusCode from 'http-status';
import AppError, { AppErrorJSON } from '@/core/errors/AppError';

export const errors = Object.freeze({
  USER_PASS_NOT_MATCH: {
    message: 'Unauthorized!',
    code: '1001',
    status: httpStatusCode.UNAUTHORIZED,
    isPublic: true,
    locales: {
      vi: 'Email và mật khẩu không đúng',
      en: 'Email or Password does not match',
    },
  },
  LOGIN_FAIL: {
    message: 'Login Failed!',
    code: '1001',
    status: httpStatusCode.UNAUTHORIZED,
    isPublic: true,
    locales: {
      vi: 'Đăng nhập không thành công',
      en: 'Login faild',
    },
  },
  UNAUTHORIZED: {
    message: 'Unauthorized!',
    code: '1001',
    status: httpStatusCode.UNAUTHORIZED,
    isPublic: true,
    locales: {
      vi: 'Đăng nhập không thành công',
      en: 'Unauthorized',
    },
  },
  USER_NOT_FOUND: {
    message: 'User not found',
    code: '1001',
    status: httpStatusCode.NOT_FOUND,
    isPublic: true,
    locales: {
      vi: 'Tài khoản không tồn tại',
      en: 'User not found',
    },
  },
  USER_ALREADY_EXIST: {
    message: 'User already exist',
    code: '1002',
    status: httpStatusCode.CONFLICT,
    isPublic: true,
    locales: {
      vi: 'Tài khoản đã tồn tại',
      en: 'User already exist',
    },
  },
});

export class UserError extends AppError {
  constructor(msg: keyof typeof errors, errDetails?: AppErrorJSON['details']) {
    super({ ...errors[msg], ...(errDetails && { details: errDetails }) });
  }
}
