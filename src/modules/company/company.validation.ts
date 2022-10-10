import validate, { Joi, Segments } from '@/core/validation';
import { ORDER, LANG_CODE, ObjectIdValidation, urlsValidation, BaseQueryValidation } from '@/types';
import { ObjectIdPattern } from '@/utils/common';
const coinSchema = Joi.object({
  name: Joi.string(),

  email: Joi.string(),

  avatar: Joi.string(),

  about: Joi.string(),

  tel: Joi.string(),

  //map location
  headquarter: Joi.string(),

  //array id of persons
  features: Joi.array().items(Joi.string()),

  services: Joi.array().items(Joi.string()),

  //array id of company
  clients: Joi.array().items(ObjectIdValidation),

  //array id of project
  projects: Joi.array().items(ObjectIdValidation),

  //array id of product
  products: Joi.array().items(ObjectIdValidation),

  //array id of categories
  categories: Joi.array().items(ObjectIdValidation),

  galleries: Joi.array().items(Joi.object()),
  //array id of coins
  cryptocurrencies: Joi.array().items(ObjectIdValidation),

  portfolios: Joi.array().items(Joi.string()),

  research_papers: Joi.array().items(Joi.object()),

  sponsored: Joi.boolean(),

  location: Joi.string(),

  supports: Joi.array().items(Joi.object()),

  team: Joi.array().items(Joi.object()),

  short_description: Joi.string(),

  urls: urlsValidation,

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
    [Segments.QUERY]: BaseQueryValidation.keys({}),
  }),
  search: validate({
    [Segments.QUERY]: BaseQueryValidation.keys({}),
  }),
};
