import httpStatusCode from 'http-status';
import AppError, { AppErrorJSON } from '@/core/errors/AppError';

const errors = Object.freeze({
  EVENT_NOT_FOUND: {
    message: 'Event not found',
    code: '5001',
    status: httpStatusCode.NOT_FOUND,
    isPublic: true,
    locales: {
      vi: 'Mục này không tồn tại',
      en: 'Event not found',
    },
  },
  EVENT_ALREADY_EXIST: {
    message: 'Event already exist',
    code: '5002',
    status: httpStatusCode.CONFLICT,
    isPublic: true,
    locales: {
      vi: 'Mục này đã tồn tại',
      en: 'Event already exists',
    },
  },
  INPUT_INVALID: {
    message: 'Input invalid',
    code: '5003',
    status: httpStatusCode.BAD_REQUEST,
    isPublic: true,
    locales: {
      vi: 'Dữ liệu nhập vào không hợp lệ',
      en: 'Input invalid',
    },
  },
});

export class EventError extends AppError {
  constructor(msg: keyof typeof errors, errDetails?: AppErrorJSON['details']) {
    super({ ...errors[msg], ...(errDetails && { details: errDetails }) });
  }
}
