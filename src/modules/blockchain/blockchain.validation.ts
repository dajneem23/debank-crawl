import validate, { Joi, Segments } from '@/core/validation';
import { LANG_CODE, ObjectIdValidation, BaseQueryValidation } from '@/types';
const blockchainSchema = Joi.object({
  name: Joi.string().required(),
  //array id of categories
  categories: Joi.array().items(ObjectIdValidation),
  //array id of coins
  cryptocurrencies: Joi.array().items(ObjectIdValidation),

  short_description: Joi.string(),

  description: Joi.string(),

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
      description: Joi.string(),
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
