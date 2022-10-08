import validate, { Joi, Segments } from '@/core/validation';
import { ORDER, LANG_CODE, ObjectIdValidation, urlsValidation } from '@/types';
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
      categories: Joi.array().items(
        Joi.string().pattern(new RegExp(ObjectIdPattern)).message('id must be a valid ObjectId'),
      ),
      deleted: Joi.boolean(),
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
      q: Joi.string().required().allow(''),
      lang: Joi.string()
        .valid(...Object.values(LANG_CODE))
        .messages({
          'any.only': 'lang must be one of: ' + Object.values(LANG_CODE).join(', ') + ' or empty',
        }),
    }),
  }),
};
