import validate, { Joi, Segments } from '@/core/validation';
import { ORDER, CATEGORY_TYPE, LANG_CODE } from '@/types';
import { ObjectIdPattern } from '@/utils/common';
export const ProductValidation = {
  create: validate({
    [Segments.BODY]: Joi.object({
      name: Joi.string(),
      contract_addresses: Joi.array().items(Joi.object()),
      cryptocurrencies: Joi.array().items(Joi.string().regex(ObjectIdPattern)),
      categories: Joi.array().items(Joi.string().regex(ObjectIdPattern)),
      features: Joi.array().items(Joi.string()),
      apps: Joi.array().items(Joi.object()),
      supports: Joi.array().items(Joi.object()),
      galleries: Joi.array().items(Joi.string()),
      information: Joi.array().items(Joi.object()),
      team: Joi.array().items(Joi.object()),
      parent_company: Joi.string(),
      team_location: Joi.string(),
      sponsored: Joi.boolean(),
      verified: Joi.boolean(),
      twitter: Joi.string(),
      telegram: Joi.string(),
      facebook: Joi.string(),
      medium: Joi.string(),
      discord: Joi.string(),
      youtube: Joi.string(),
      website: Joi.string(),
      blog: Joi.string(),
      reddit: Joi.string(),
      about: Joi.string(),
      avatar: Joi.string(),
      rocket_chat: Joi.string(),

      trans: Joi.array().items(
        Joi.object({
          lang: Joi.string()
            .valid(...Object.values(LANG_CODE))
            .required()
            .messages({
              'any.only': 'lang must be one of: ' + Object.values(LANG_CODE).join(', ') + ' or empty',
            }),
          about: Joi.string(),
        }),
      ),
    }),
  }),
  update: validate({
    [Segments.BODY]: Joi.object({
      name: Joi.string(),
      contract_addresses: Joi.array().items(Joi.object()),
      cryptocurrencies: Joi.array().items(Joi.string().regex(ObjectIdPattern)),
      categories: Joi.array().items(Joi.string().regex(ObjectIdPattern)),
      features: Joi.array().items(Joi.string()),
      apps: Joi.array().items(Joi.object()),
      supports: Joi.array().items(Joi.object()),
      galleries: Joi.array().items(Joi.string()),
      information: Joi.array().items(Joi.object()),
      team: Joi.array().items(Joi.object()),
      parent_company: Joi.string(),
      team_location: Joi.string(),
      sponsored: Joi.boolean(),
      verified: Joi.boolean(),
      twitter: Joi.string(),
      telegram: Joi.string(),
      facebook: Joi.string(),
      medium: Joi.string(),
      discord: Joi.string(),
      youtube: Joi.string(),
      website: Joi.string(),
      blog: Joi.string(),
      reddit: Joi.string(),
      about: Joi.string(),
      avatar: Joi.string(),
      rocket_chat: Joi.string(),
      trans: Joi.array().items(
        Joi.object({
          lang: Joi.string()
            .valid(...Object.values(LANG_CODE))
            .required()
            .messages({
              'any.only': 'lang must be one of: ' + Object.values(LANG_CODE).join(', ') + ' or empty',
            }),
          about: Joi.string(),
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
