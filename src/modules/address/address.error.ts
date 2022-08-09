import httpStatusCode from 'http-status';
import AppError, { AppErrorJSON } from '@/core/errors/AppError';

export const errors = Object.freeze({
  ADDRESS_NOT_FOUND: {
    message: 'Address does not exist',
    code: null,
    status: httpStatusCode.NOT_FOUND,
    isPublic: true,
    locales: {
      vi: 'Địa chỉ không tồn tại',
    },
  },
});

export class AddressError extends AppError {
  constructor(msg: keyof typeof errors, errDetails?: AppErrorJSON['details']) {
    super({ ...errors[msg], ...(errDetails && { details: errDetails }) });
  }
}
