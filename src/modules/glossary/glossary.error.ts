import httpStatusCode from 'http-status';
import AppError, { AppErrorJSON } from '@/core/errors/AppError';
import { CommonError } from '@/types/Error';
const errors = Object.freeze({
  NOT_FOUND: {
    message: 'Glossary not found',
    code: '5001',
    status: httpStatusCode.NOT_FOUND,
    isPublic: true,
    locales: {
      vi: 'Mục này không tồn tại',
      en: 'Glossary not found',
    },
  },
  ALREADY_EXIST: {
    message: 'Glossary already exist',
    code: '5002',
    status: httpStatusCode.CONFLICT,
    isPublic: true,
    locales: {
      vi: 'Mục này đã tồn tại',
      en: 'Glossary already exists',
    },
  },
  ...CommonError,
});
export const glossaryErrors = errors;
export class GlossaryError extends AppError {
  constructor(msg: keyof typeof errors, errDetails?: AppErrorJSON['details']) {
    super({ ...errors[msg], ...(errDetails && { details: errDetails }) });
  }
}
