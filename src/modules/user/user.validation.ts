import validate, { Joi, Segments } from '@/core/validation';
import { ORDER, USER_STATUS } from '@/types/Common';

const userSchema = Joi.object({
  role_id: Joi.string().guid(),
  name: Joi.string().required(),
  email: Joi.string().required(),
  language: Joi.string(),
  translation_source_languages: Joi.string(),
  translation_target_languages: Joi.string(),
  status: Joi.string().valid(USER_STATUS).default(USER_STATUS.INACTIVE),
  username: Joi.string().required(),
  first_name: Joi.string(),
  last_name: Joi.string(),
  about: Joi.string(),
  location: Joi.string(),
  website: Joi.string(),
  avatar: Joi.string(),
});

export const privateQuery = validate({
  [Segments.QUERY]: Joi.object({
    page: Joi.number().default(1),
    perPage: Joi.number().default(10),
    sortBy: Joi.string().default('created_at'),
    sortOrder: Joi.string().valid(ORDER).default(ORDER.ASC),
    status: Joi.string().valid(USER_STATUS),
    q: Joi.string().allow(''),
  }),
});

export const createUser = validate({
  [Segments.BODY]: userSchema,
});

export const login = validate({
  [Segments.BODY]: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
});

export const updateUser = validate({
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().guid(),
  }),
  [Segments.BODY]: Joi.object({
    name: Joi.string(),
    email: Joi.string(),
    language: Joi.string(),
    translation_source_languages: Joi.string(),
    translation_target_languages: Joi.string(),
    status: Joi.string().valid(USER_STATUS).default(USER_STATUS.INACTIVE),
    role_id: Joi.string().guid(),
    username: Joi.string().required(),
    first_name: Joi.string(),
    last_name: Joi.string(),
    about: Joi.string(),
    location: Joi.string(),
    website: Joi.string(),
    avatar: Joi.string(),
  }),
});

export const subscribe = validate({
  [Segments.BODY]: Joi.object({
    categories: Joi.array().items(Joi.string()).required(),
  }),
});
