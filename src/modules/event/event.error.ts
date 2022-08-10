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
});

export class EventError extends AppError {
  constructor(msg: keyof typeof errors, errDetails?: AppErrorJSON['details']) {
    super({ ...errors[msg], ...(errDetails && { details: errDetails }) });
  }
}
