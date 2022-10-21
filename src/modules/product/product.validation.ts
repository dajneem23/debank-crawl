import validate, { Joi, Segments } from '@/core/validation';
import { ORDER, CATEGORY_TYPE, LANG_CODE, ObjectIdValidation, urlsValidation, BaseQueryValidation } from '@/types';
import { ObjectIdPattern } from '@/utils/common';

const productSchema = Joi.object({
  name: Joi.string(),
  contract_addresses: Joi.array().items(Joi.object()),
  cryptocurrencies: Joi.array().items(ObjectIdValidation),
  categories: Joi.array().items(ObjectIdValidation),
  features: Joi.array().items(Joi.string()),
  apps: Joi.array().items(Joi.object()),
  supports: Joi.array().items(Joi.object()),
  information: Joi.array().items(Joi.object()),
  team: Joi.array().items(Joi.object()),
  parent_company: Joi.string(),
  team_location: Joi.string(),
  sponsored: Joi.boolean(),
  verified: Joi.boolean(),
  urls: urlsValidation,
  description: Joi.string(),
  avatar: Joi.string(),
  trans: Joi.array().items(
    Joi.object({
      lang: Joi.string()
        .valid(...Object.values(LANG_CODE))
        .required()
        .messages({
          'any.only': 'lang must be one of: ' + Object.values(LANG_CODE).join(', ') + ' or empty',
        }),
      description: Joi.string(),
      features: Joi.array().items(Joi.string()),
      services: Joi.array().items(Joi.string()),
    }),
  ),
});
export const ProductValidation = {
  create: validate({
    [Segments.BODY]: productSchema,
  }),
  update: validate({
    [Segments.BODY]: productSchema,
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
    [Segments.QUERY]: BaseQueryValidation,
  }),
  search: validate({
    [Segments.QUERY]: BaseQueryValidation,
  }),
};
