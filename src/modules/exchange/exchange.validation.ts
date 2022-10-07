import validate, { Joi, Segments } from '@/core/validation';
import { ORDER, LANG_CODE, ObjectIdValidation, CONVERT_CURRENCY_CODE } from '@/types';
import { ObjectIdPattern } from '@/utils/common';
import { mapValues } from 'lodash';
const convertCurrencySchema = Joi.object({
  volume_24h: Joi.number(),
  volume_7d: Joi.number(),
  volume_30d: Joi.number(),
  volume_24h_adjusted: Joi.number(),
  percent_change_volume_24h: Joi.number(),
  percent_change_volume_7d: Joi.number(),
  percent_change_volume_30d: Joi.number(),
  effective_liquidity_24h: Joi.number(),
});
const marketDataSchema = Joi.object({}).keys({
  maker_fee: Joi.number(),
  taker_fee: Joi.number(),
  spot_volume_usd: Joi.number(),
  spot_volume_last_updated: Joi.date(),
  num_coins: Joi.number(),
  num_market_pairs: Joi.number(),
  traffic_score: Joi.number(),
  exchange_score: Joi.number(),
  liquidity_score: Joi.number(),
  ...mapValues(CONVERT_CURRENCY_CODE, () => convertCurrencySchema),
});

const ExchangeSchema = Joi.object({
  launched: Joi.date(),
  about: Joi.string(),
  fiats: Joi.array().items(Joi.string()),
  type: Joi.string(),
  countries: Joi.array().items(Joi.string()),
  status: Joi.string(),
  rank: Joi.number(),
  weekly_visits: Joi.number(),
  market_data: marketDataSchema,
});
export const ExchangeValidation = {
  create: validate({
    [Segments.BODY]: ExchangeSchema,
  }),
  update: validate({
    [Segments.BODY]: ExchangeSchema,
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
