import validate, { Joi, Segments } from '@/core/validation';
import { BaseQueryValidation } from '@/types';

export const updateMe = validate({
  [Segments.BODY]: Joi.object({
    full_name: Joi.string(),
    picture: Joi.string().uri().allow(''),
    gender: Joi.string().valid('male', 'female', 'other'),
    dob: Joi.date(),
  }),
});

export const privateQuery = validate({
  [Segments.QUERY]: BaseQueryValidation.keys({
    status: Joi.string().valid('active', 'inactive', 'suspended'),
  }),
});

export const privateCreateUpdateUser = validate({
  [Segments.BODY]: Joi.object({
    email: Joi.string().email(),
    phone: Joi.string(),
    full_name: Joi.string(),
    picture: Joi.string().uri().allow(''),
    gender: Joi.string().valid('male', 'female', 'other'),
    dob: Joi.date(),
    metadata: Joi.object({
      admin_note: Joi.string().allow(''),
    }),
  }),
});

export const privateSetRoles = validate({
  [Segments.BODY]: Joi.object({
    roles: Joi.array().items(Joi.string().valid('user', 'admin')).min(1).required(),
  }),
});
