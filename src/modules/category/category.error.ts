import AppError, { AppErrorJSON } from '@/core/errors/AppError';
import { CommonError } from '@/types/Error';
const errors = Object.freeze({
  CATEGORY_NOT_FOUND: {
    message: 'Category not found',
    code: '5001',
    status: 404,
    isPublic: true,
    locales: {
      vi: 'Mục này không tồn tại',
      en: 'Category not found',
    },
  },
  CATEGORY_ALREADY_EXIST: {
    message: 'Category already exist',
    code: '5002',
    status: 409,
    isPublic: true,
    locales: {
      vi: 'Mục này đã tồn tại',
      en: 'Category already exists',
    },
  },
  ...CommonError,
});

export class CategoryError extends AppError {
  constructor(msg: keyof typeof errors, errDetails?: AppErrorJSON['details']) {
    super({ ...errors[msg], ...(errDetails && { details: errDetails }) });
  }
}
