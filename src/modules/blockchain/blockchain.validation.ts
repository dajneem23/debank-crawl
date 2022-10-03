import validate, { Joi, Segments } from '@/core/validation';
import { ORDER, LANG_CODE } from '@/types';
import { ObjectIdPattern } from '@/utils/common';
const blockchainSchema = Joi.object({
  name: Joi.string().required(),
  //array id of categories
  categories: Joi.array().items(Joi.string().regex(ObjectIdPattern)),
  //array id of coins
  cryptocurrencies: Joi.array().items(Joi.string().regex(ObjectIdPattern)),

  short_description: Joi.string(),

  about: Joi.string(),

  consensus: Joi.string(),

  author: Joi.string(),

  launch_date: Joi.date(),

  programmable: Joi.boolean(),

  private: Joi.boolean(),

  version: Joi.string(),

  confirmations: Joi.number(),

  difficulty: Joi.string(),

  transactions: Joi.number(),

  height: Joi.number(),

  merkle_root: Joi.string(),

  nonce: Joi.number(),

  bits: Joi.string(),

  size: Joi.number(),

  fee: Joi.number(),

  hash: Joi.string(),

  mined_by: Joi.string(),

  block_reward: Joi.string(),

  uncles_reward: Joi.string(),

  gas_used: Joi.string(),

  gas_limit: Joi.string(),

  extra_data: Joi.string(),

  parent_hash: Joi.string(),

  sha3_uncles: Joi.string(),

  state_root: Joi.string(),

  timestamp: Joi.date(),

  tvl: Joi.string(),

  total_accounts: Joi.number(),

  total_transactions: Joi.number(),

  total_contracts: Joi.number(),

  total_txns: Joi.number(),

  total_transfer_value: Joi.number(),

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
});
export const BlockchainValidation = {
  create: validate({
    [Segments.BODY]: blockchainSchema,
  }),
  update: validate({
    [Segments.BODY]: blockchainSchema,
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