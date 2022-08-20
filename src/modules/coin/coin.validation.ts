import validate, { Joi, Segments } from '@/core/validation';
import { ORDER, CATEGORY_TYPE } from '@/types';
import { ObjectIdPattern } from '@/utils/common';
export const CoinValidation = {
  create: validate({
    [Segments.BODY]: Joi.object({
      name: Joi.string(),

      token_id: Joi.string(),

      //array id of categories
      categories: Joi.array().items(Joi.string().regex(ObjectIdPattern)),

      explorer: Joi.string(),

      stack_exchange: Joi.string(),

      blockchains: Joi.array().items(Joi.string()),

      whitepaper: Joi.string(),

      wallets: Joi.array().items(Joi.string()),

      exchanges: Joi.array().items(Joi.string()),

      technologies: Joi.array().items(Joi.object()),

      features: Joi.array().items(Joi.string()),

      services: Joi.array().items(Joi.string()),

      team: Joi.array().items(Joi.object()),

      ico: Joi.array().items(Joi.object()),

      twitter: Joi.string(),

      telegram: Joi.string(),

      facebook: Joi.string(),

      instagram: Joi.string(),

      linkedin: Joi.string(),

      github: Joi.string(),

      medium: Joi.string(),

      youtube: Joi.string(),

      website: Joi.string(),

      blog: Joi.string(),

      email: Joi.string(),

      tel: Joi.string(),

      about: Joi.string(),

      avatar: Joi.string(),

      rocket_chat: Joi.string(),

      bitcoin_talk: Joi.string(),
    }),
  }),
  update: validate({
    [Segments.BODY]: Joi.object({
      name: Joi.string(),

      token_id: Joi.string(),

      //array id of categories
      categories: Joi.array().items(Joi.string().regex(ObjectIdPattern)),

      explorer: Joi.string(),

      stack_exchange: Joi.string(),

      blockchains: Joi.array().items(Joi.string()),

      whitepaper: Joi.string(),

      wallets: Joi.array().items(Joi.string()),

      exchanges: Joi.array().items(Joi.string()),

      technologies: Joi.array().items(Joi.object()),

      features: Joi.array().items(Joi.string()),

      services: Joi.array().items(Joi.string()),

      team: Joi.array().items(Joi.object()),

      ico: Joi.array().items(Joi.object()),

      twitter: Joi.string(),

      telegram: Joi.string(),

      facebook: Joi.string(),

      instagram: Joi.string(),

      linkedin: Joi.string(),

      github: Joi.string(),

      medium: Joi.string(),

      youtube: Joi.string(),

      website: Joi.string(),

      blog: Joi.string(),

      email: Joi.string(),

      tel: Joi.string(),

      about: Joi.string(),

      avatar: Joi.string(),

      rocket_chat: Joi.string(),

      bitcoin_talk: Joi.string(),
    }),
    [Segments.PARAMS]: Joi.object({
      id: Joi.string().regex(ObjectIdPattern).required(),
    }),
  }),
  delete: validate({
    [Segments.PARAMS]: Joi.object({
      id: Joi.string().regex(ObjectIdPattern).required(),
    }),
  }),
  getById: validate({
    [Segments.PARAMS]: Joi.object({
      id: Joi.string().regex(ObjectIdPattern).required(),
    }),
  }),
  query: validate({
    [Segments.QUERY]: Joi.object({
      page: Joi.number().default(1).min(1),
      per_page: Joi.number().default(10).min(1),
      sort_by: Joi.string(),
      sort_order: Joi.string()
        .default(ORDER.ASC)
        .valid(...Object.values(ORDER)),
      q: Joi.string(),
    }),
  }),
};
