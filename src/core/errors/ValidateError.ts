import AppError, { AppErrorJSON } from '@/core/errors/AppError';
import { CommonError } from '@/types/Error';
const errors = Object.freeze({
  not_found: {
    message: 'Refs Not found',
    code: '1111',
    status: 200,
    isPublic: true,
    locales: {
      vi: 'Refs không tồn tại',
      en: 'Refs Not found',
    },
  },
  ...CommonError,
});

export class ValidateError extends AppError {
  constructor(msg: keyof typeof errors, errDetails?: AppErrorJSON['details']) {
    super({ ...errors[msg], ...(errDetails && { details: errDetails }) });
  }
}
