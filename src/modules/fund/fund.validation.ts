import validate, { Joi, Segments } from '@/core/validation';
import {
  ORDER,
  CATEGORY_TYPE,
  LANG_CODE,
  COMPANY_TYPE,
  ObjectIdValidation,
  BaseQueryValidation,
  urlsValidation,
} from '@/types';

const FundValidationSchema = Joi.object({
  name: Joi.string(),

  description: Joi.string(),

  short_description: Joi.string(),

  avatar: Joi.string(),

  avatars: Joi.array().items(Joi.string()),

  total_amount: Joi.number().min(0),

  // total_investments: Joi.number().min(0),
  type: Joi.string().valid(...Object.values(COMPANY_TYPE)),

  fundraising_rounds: Joi.array().items(Joi.string()),

  partners: Joi.array().items(Joi.string()),

  firms: Joi.array().items(Joi.string()),

  posts: Joi.array(),

  investments: Joi.array(),

  funding: Joi.number(),

  current_roi: Joi.number(),

  ath_roi: Joi.number(),

  typical_project: Joi.string(),

  typical_category: Joi.string(),

  tier: Joi.number(),

  rating: Joi.number(),

  assets_allocation: Joi.string(),
  //array id of categories
  categories: Joi.array().items(ObjectIdValidation),

  galleries: Joi.array().items(Joi.object()),
  //array id of coins
  cryptocurrencies: Joi.array().items(ObjectIdValidation),

  sponsored: Joi.boolean(),

  location: Joi.string(),

  supports: Joi.array().items(Joi.object()),

  team: Joi.array().items(Joi.object()),

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
    }),
  ),
});
export const FundValidation = {
  create: validate({
    [Segments.BODY]: FundValidationSchema,
  }),
  update: validate({
    [Segments.BODY]: FundValidationSchema,
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
      launched_from: Joi.number(),
      launched_to: Joi.number(),
      tier: Joi.string(),
      type: Joi.string().valid(...Object.values(COMPANY_TYPE)),
      deleted: Joi.boolean(),
    }),
  }),
  search: validate({
    [Segments.QUERY]: BaseQueryValidation,
  }),
};
