import validate, { Joi, Segments } from '@/core/validation';
import { ORDER, CATEGORY_TYPE, LANG_CODE, FUND_TYPE } from '@/types';
import { ObjectIdPattern } from '@/utils/common';

export const FundValidation = {
  create: validate({
    [Segments.BODY]: Joi.object({
      name: Joi.string(),

      //map location
      about: Joi.string(),

      avatar: Joi.string(),

      avatars: Joi.array().items(Joi.string()),

      total_amount: Joi.number().min(0),

      total_investments: Joi.number().min(0),

      type: Joi.string().valid(...Object.values(FUND_TYPE)),

      fundraising_rounds: Joi.array().items(
        Joi.object().keys({
          round_name: Joi.string(),
          round_id: Joi.string(),
          stage: Joi.string(),
          amount: Joi.number(),
        }),
      ),

      partners: Joi.array().items(
        Joi.object().keys({
          name: Joi.string(),
          foreign_id: Joi.string(),
        }),
      ),

      firms: Joi.array().items(
        Joi.object().keys({
          name: Joi.string(),
          foreign_id: Joi.string(),
        }),
      ),
      //array id of categories
      categories: Joi.array().items(Joi.string().regex(ObjectIdPattern)),

      galleries: Joi.array().items(Joi.object()),
      //array id of coins
      cryptocurrencies: Joi.array().items(Joi.string().regex(ObjectIdPattern)),

      sponsored: Joi.boolean(),

      location: Joi.string(),

      supports: Joi.array().items(Joi.object()),

      team: Joi.array().items(Joi.object()),

      short_description: Joi.string(),

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

      rocket_chat: Joi.string(),

      bitcoin_talk: Joi.string(),

      trans: Joi.array().items(
        Joi.object({
          lang: Joi.string()
            .valid(...Object.values(LANG_CODE))
            .required()
            .messages({
              'any.only': 'lang must be one of: ' + Object.values(LANG_CODE).join(', ') + ' or empty',
            }),
          about: Joi.string(),
          short_description: Joi.string(),
        }),
      ),
    }),
  }),
  update: validate({
    [Segments.BODY]: Joi.object({
      name: Joi.string(),

      //map location
      about: Joi.string(),

      avatar: Joi.string(),

      avatars: Joi.array().items(Joi.string()),

      total_amount: Joi.number().min(0),

      type: Joi.string(),

      fundraising_rounds: Joi.array().items(
        Joi.object().keys({
          round_name: Joi.string(),
          round_id: Joi.string(),
          stage: Joi.string(),
          amount: Joi.number(),
        }),
      ),

      partners: Joi.array().items(
        Joi.object().keys({
          name: Joi.string(),
          foreign_id: Joi.string(),
        }),
      ),

      firms: Joi.array().items(
        Joi.object().keys({
          name: Joi.string(),
          foreign_id: Joi.string(),
        }),
      ),
      //array id of categories
      categories: Joi.array().items(Joi.string().regex(ObjectIdPattern)),

      galleries: Joi.array().items(Joi.object()),
      //array id of coins
      cryptocurrencies: Joi.array().items(Joi.string()),

      sponsored: Joi.boolean(),

      location: Joi.string(),

      supports: Joi.array().items(Joi.object()),

      team: Joi.array().items(Joi.object()),

      short_description: Joi.string(),

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

      rocket_chat: Joi.string(),

      bitcoin_talk: Joi.string(),

      trans: Joi.array().items(
        Joi.object({
          lang: Joi.string()
            .valid(...Object.values(LANG_CODE))
            .required()
            .messages({
              'any.only': 'lang must be one of: ' + Object.values(LANG_CODE).join(', ') + ' or empty',
            }),
          about: Joi.string(),
          short_description: Joi.string(),
        }),
      ),
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
    [Segments.QUERY]: Joi.object({
      lang: Joi.string()
        .valid(...Object.values(LANG_CODE))
        .messages({
          'any.only': 'lang must be one of: ' + Object.values(LANG_CODE).join(', ') + ' or empty',
        }),
    }),
  }),
  getBySlug: validate({
    [Segments.PARAMS]: Joi.object({
      slug: Joi.string().required(),
    }),
    [Segments.QUERY]: Joi.object({
      lang: Joi.string()
        .valid(...Object.values(LANG_CODE))
        .messages({
          'any.only': 'lang must be one of: ' + Object.values(LANG_CODE).join(', ') + ' or empty',
        }),
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
      lang: Joi.string()
        .valid(...Object.values(LANG_CODE))
        .messages({
          'any.only': 'lang must be one of: ' + Object.values(LANG_CODE).join(', ') + ' or empty',
        }),
      categories: Joi.array().items(Joi.string().regex(ObjectIdPattern)),
      funding_min: Joi.number(),
      funding_max: Joi.number(),
      year_founded_from: Joi.number(),
      year_founded_to: Joi.number(),
    }),
  }),
  search: validate({
    [Segments.QUERY]: Joi.object({
      page: Joi.number().default(1).min(1),
      per_page: Joi.number().default(10).min(1),
      sort_by: Joi.string(),
      sort_order: Joi.string()
        .default(ORDER.ASC)
        .valid(...Object.values(ORDER)),
      q: Joi.string().required(),
      lang: Joi.string()
        .valid(...Object.values(LANG_CODE))
        .messages({
          'any.only': 'lang must be one of: ' + Object.values(LANG_CODE).join(', ') + ' or empty',
        }),
    }),
  }),
};
