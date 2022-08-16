import httpStatusCode from 'http-status';
import AppError, { AppErrorJSON } from '@/core/errors/AppError';
import { CommonError } from '@/types/error';
const errors = Object.freeze({
  NOT_FOUND: {
    message: 'Coin not found',
    code: '5001',
    status: httpStatusCode.NOT_FOUND,
    isPublic: true,
    locales: {
      vi: 'Mục này không tồn tại',
      en: 'Coin not found',
    },
  },
  ALREADY_EXIST: {
    message: 'Coin already exist',
    code: '5002',
    status: httpStatusCode.CONFLICT,
    isPublic: true,
    locales: {
      vi: 'Mục này đã tồn tại',
      en: 'Coin already exists',
    },
  },
  ...CommonError,
});

export class CoinError extends AppError {
  constructor(msg: keyof typeof errors, errDetails?: AppErrorJSON['details']) {
    super({ ...errors[msg], ...(errDetails && { details: errDetails }) });
  }
}
