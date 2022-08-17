import validate, { Joi, Segments } from '@/core/validation';
import { ORDER, CATEGORY_TYPE } from '@/types';
import { ObjectIdPattern } from '@/utils/common';
export const ProductValidation = {
  create: validate({
    [Segments.BODY]: Joi.object({
      name: Joi.string(),

      director: Joi.string(),

      contract_addresses: Joi.object(),

      crypto_currencies: Joi.array().items(Joi.string().regex(ObjectIdPattern)),

      //array id of categories
      categories: Joi.array().items(Joi.string().regex(ObjectIdPattern)),

      software_license: Joi.string(),

      features: Joi.array().items(Joi.string()),

      ccys: Joi.array().items(Joi.string()),

      token: Joi.string(),

      ios_app: Joi.string(),

      google_play_app: Joi.string(),

      chrome_extension: Joi.string(),

      mac_app: Joi.string(),

      linux_app: Joi.string(),

      windows_app: Joi.string(),

      wiki: Joi.string(),
    }),
  }),
  update: validate({
    [Segments.BODY]: Joi.object({
      name: Joi.string(),

      director: Joi.string(),

      contract_addresses: Joi.object(),

      crypto_currencies: Joi.array().items(Joi.string().regex(ObjectIdPattern)),

      //array id of categories
      categories: Joi.array().items(Joi.string().regex(ObjectIdPattern)),

      software_license: Joi.string(),

      features: Joi.array().items(Joi.string()),

      ccys: Joi.array().items(Joi.string()),

      token: Joi.string(),

      ios_app: Joi.string(),

      google_play_app: Joi.string(),

      chrome_extension: Joi.string(),

      mac_app: Joi.string(),

      linux_app: Joi.string(),

      windows_app: Joi.string(),

      wiki: Joi.string(),
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
