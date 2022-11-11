import AppError, { AppErrorJSON } from '@/core/errors/AppError';
import { CommonError } from '@/types/Error';
const errors = Object.freeze({
  NOT_FOUND: {
    message: 'Exchange not found',
    code: '5001',
    status: 404,
    isPublic: true,
    locales: {
      vi: 'Mục này không tồn tại',
      en: 'Exchange not found',
    },
  },
  ALREADY_EXIST: {
    message: 'Exchange already exist',
    code: '5002',
    status: 409,
    isPublic: true,
    locales: {
      vi: 'Mục này đã tồn tại',
      en: 'Exchange already exists',
    },
  },
  ...CommonError,
});
export const exchangeErrors = errors;
export class ExchangeError extends AppError {
  constructor(msg: keyof typeof errors, errDetails?: AppErrorJSON['details']) {
    super({ ...errors[msg], ...(errDetails && { details: errDetails }) });
  }
}
