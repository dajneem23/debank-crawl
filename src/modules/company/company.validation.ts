import validate, { Joi, Segments } from '@/core/validation';
import { LANG_CODE, ObjectIdValidation, urlsValidation, BaseQueryValidation, COMPANY_TYPE } from '@/types';
const coinSchema = Joi.object({
  name: Joi.string(),

  email: Joi.string(),

  avatar: Joi.string(),

  about: Joi.string(),

  tel: Joi.string(),

  headquarter: Joi.string(),

  location: Joi.string(),

  features: Joi.array().items(Joi.string()),

  services: Joi.array().items(Joi.string()),

  clients: Joi.array().items(Joi.string()),

  projects: Joi.array().items(Joi.string()),

  products: Joi.array().items(Joi.string()),

  //array id of categories
  categories: Joi.array().items(Joi.string()),

  //array id of coins
  cryptocurrencies: Joi.array().items(Joi.string()),

  portfolio_companies: Joi.array().items(Joi.string()),

  portfolio_funds: Joi.array().items(Joi.string()),

  research_papers: Joi.array().items(Joi.object()),

  investment_stage: Joi.array().items(Joi.string()),

  supports: Joi.array().items(
    Joi.object().keys({
      name: Joi.string(),
      url: Joi.string(),
    }),
  ),

  team: Joi.array().items(Joi.object()),

  short_description: Joi.string(),

  recent_twitter: Joi.string(),

  urls: urlsValidation,

  trans: Joi.array().items(
    Joi.object({
      lang: Joi.string()
        .valid(...Object.values(LANG_CODE))
        .required()
        .messages({
          'any.only': 'lang must be one of: ' + Object.values(LANG_CODE).join(', ') + ' or empty',
        }),
      description: Joi.string(),
      short_description: Joi.string(),
      features: Joi.array().items(Joi.string()),
      services: Joi.array().items(Joi.string()),
    }),
  ),
});
export const CompanyValidation = {
  create: validate({
    [Segments.BODY]: coinSchema,
  }),
  update: validate({
    [Segments.BODY]: coinSchema,
    [Segments.PARAMS]: Joi.object({
      id: ObjectIdValidation,
    }),
  }),
  delete: validate({
    [Segments.PARAMS]: Joi.object({
      id: ObjectIdValidation,
    }),
  }),
  getById: validate({
    [Segments.PARAMS]: Joi.object({
      id: ObjectIdValidation,
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
    [Segments.QUERY]: BaseQueryValidation.keys({
      funding_min: Joi.number(),
      funding_max: Joi.number(),
      tier: Joi.string(),
      type: Joi.string(),
      deleted: Joi.boolean(),
    }),
  }),
  search: validate({
    [Segments.QUERY]: BaseQueryValidation,
  }),
};
