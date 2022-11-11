import AppError, { AppErrorJSON } from '@/core/errors/AppError';
import { CommonError } from '@/types/Error';
const errors = Object.freeze({
  NOT_FOUND: {
    message: 'Asset not found',
    code: '5001',
    status: 404,
    isPublic: true,
    locales: {
      vi: 'Mục này không tồn tại',
      en: 'Asset not found',
    },
  },
  ALREADY_EXIST: {
    message: 'Asset already exist',
    code: '5002',
    status: 409,
    isPublic: true,
    locales: {
      vi: 'Mục này đã tồn tại',
      en: 'Asset already exists',
    },
  },
  ...CommonError,
});
export const assetErrors = errors;
export class AssetError extends AppError {
  constructor(msg: keyof typeof errors, errDetails?: AppErrorJSON['details']) {
    super({ ...errors[msg], ...(errDetails && { details: errDetails }) });
  }
}
