import validate, { Joi, Segments } from '@/core/validation';
import { ORDER, CATEGORY_TYPE, LANG_CODE } from '@/types';
import { ObjectIdPattern } from '@/utils/common';
export const CompanyValidation = {
  create: validate({
    [Segments.BODY]: Joi.object({
      name: Joi.string(),

      //map location
      headquarter: Joi.object(),

      //array id of persons

      features: Joi.array().items(Joi.string()),

      services: Joi.array().items(Joi.object()),

      //array id of company
      clients: Joi.array().items(Joi.string().regex(ObjectIdPattern)),

      //array id of project
      projects: Joi.array().items(Joi.string().regex(ObjectIdPattern)),

      //array id of product
      products: Joi.array().items(Joi.string().regex(ObjectIdPattern)),

      //array id of categories
      categories: Joi.array().items(Joi.string().regex(ObjectIdPattern)),

      galleries: Joi.array().items(Joi.object()),
      //array id of coins
      crypto_currencies: Joi.array().items(Joi.string().regex(ObjectIdPattern)),

      portfolios: Joi.array().items(Joi.string()),

      research_papers: Joi.array().items(Joi.object()),

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

      about: Joi.string(),

      avatar: Joi.string(),

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
      headquarter: Joi.object(),

      features: Joi.array().items(Joi.string()),

      services: Joi.array().items(Joi.object()),

      //array id of company
      clients: Joi.array().items(Joi.string().regex(ObjectIdPattern)),

      //array id of project
      projects: Joi.array().items(Joi.string().regex(ObjectIdPattern)),

      //array id of product
      products: Joi.array().items(Joi.string().regex(ObjectIdPattern)),

      //array id of categories
      categories: Joi.array().items(Joi.string().regex(ObjectIdPattern)),

      galleries: Joi.array().items(Joi.object()),
      //array id of coins
      crypto_currencies: Joi.array().items(Joi.string().regex(ObjectIdPattern)),

      portfolios: Joi.array().items(Joi.string()),

      location: Joi.string(),

      supports: Joi.array().items(Joi.object()),

      team: Joi.array().items(Joi.object()),

      research_papers: Joi.array().items(Joi.object()),

      sponsored: Joi.boolean(),

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

      about: Joi.string(),

      avatar: Joi.string(),

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
