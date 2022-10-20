import validate, { Joi, Segments } from '@/core/validation';
import {
  LANG_CODE,
  BACKER,
  CONVERT_CURRENCY_CODE,
  ObjectIdValidation,
  urlsValidation,
  TIME_PERIOD,
  BaseQueryValidation,
} from '@/types';
import { ObjectIdPattern } from '@/utils/common';
import { mapValues } from 'lodash';
const valueByDateSchema = Joi.object({
  timestamp: Joi.date(),
  value: Joi.number(),
});
const TimePeriodPriceSchema = Joi.object({
  price: Joi.number(),
  open: Joi.number(),
  high: Joi.number(),
  low: Joi.number(),
  close: Joi.number(),
  volume: Joi.number(),
  market_cap: Joi.number(),
  tvl: Joi.number(),
  long: Joi.number(),
  short: Joi.number(),
  percent_change: Joi.number(),
  list_price: Joi.array().items(valueByDateSchema),
  latest_price: Joi.number(),
  volume_change: Joi.number(),
  volume_reported: Joi.number(),
  list_market_cap: Joi.array().items(valueByDateSchema),
  close_timestamp: Joi.date(),
  high_timestamp: Joi.date(),
  low_timestamp: Joi.date(),
  open_timestamp: Joi.date(),
});
const convertCurrencySchema = Joi.object({}).keys({
  price: Joi.number(),
  open: Joi.number(),
  high: Joi.number(),
  low: Joi.number(),
  close: Joi.number(),
  volume: Joi.number(),
  market_cap: Joi.number(),
  tvl: Joi.number(),
  long: Joi.number(),
  short: Joi.number(),

  market_cap_dominance: Joi.number(),
  fully_diluted_market_cap: Joi.number(),
  market_cap_by_total_supply: Joi.number(),

  // volume_change_24h: Joi.number(),

  // latest_price_1h: Joi.array().items(Joi.number()),
  // latest_price_24h: Joi.array().items(Joi.number()),
  // latest_price_7d: Joi.array().items(Joi.number()),

  // volume_24h: Joi.number(),
  // volume_7d: Joi.number(),
  // volume_30d: Joi.number(),

  // percent_change_1h: Joi.number(),
  // percent_change_24h: Joi.number(),
  // percent_change_7d: Joi.number(),

  list_price: Joi.array().items(valueByDateSchema),
  // list_price_1h: Joi.array().items(valueByDateSchema),
  // list_price_24h: Joi.array().items(valueByDateSchema),
  // list_price_7d: Joi.array().items(valueByDateSchema),
  // list_price_30d: Joi.array().items(valueByDateSchema),
  // list_price_90d: Joi.array().items(valueByDateSchema),
  // list_price_180d: Joi.array().items(valueByDateSchema),
  // list_price_365d: Joi.array().items(valueByDateSchema),
  // list_price_all_time: Joi.array().items(valueByDateSchema),

  // volume_24h_reported: Joi.number(),
  // volume_7d_reported: Joi.number(),
  // volume_30d_reported: Joi.number(),

  // percent_change_30d: Joi.number(),
  // percent_change_60d: Joi.number(),
  // percent_change_90d: Joi.number(),

  // list_market_cap_1d: Joi.array().items(valueByDateSchema),
  // list_market_cap_7d: Joi.array().items(valueByDateSchema),
  // list_market_cap_30d: Joi.array().items(valueByDateSchema),
  // list_market_cap_90d: Joi.array().items(valueByDateSchema),
  // list_market_cap_180d: Joi.array().items(valueByDateSchema),
  // list_market_cap_365d: Joi.array().items(valueByDateSchema),

  last_updated: Joi.date(),

  ...mapValues(TIME_PERIOD, () => TimePeriodPriceSchema),
});
const marketDataSchema = Joi.object({}).keys({
  circulating_supply: Joi.number(),

  total_supply: Joi.number(),

  max_supply: Joi.number(),

  num_market_pairs: Joi.number(),

  tvl_ratio: Joi.number(),

  self_reported_circulating_supply: Joi.number(),

  self_reported_market_cap: Joi.number(),

  ...mapValues(CONVERT_CURRENCY_CODE, () => convertCurrencySchema),
});
const assetSchema = Joi.object({
  name: Joi.string(),

  symbol: Joi.string(),

  avatar: Joi.string(),

  about: Joi.string(),

  //array id of categories
  categories: Joi.array().items(
    Joi.string().pattern(new RegExp(ObjectIdPattern)).message('id must be a valid ObjectId'),
  ),

  explorer: Joi.string(),

  blockchains: Joi.array().items(Joi.string()),

  wallets: Joi.array().items(Joi.string()),

  exchanges: Joi.array().items(Joi.string()),

  technologies: Joi.object(),

  features: Joi.array().items(Joi.string()),

  services: Joi.array().items(Joi.string()),

  team: Joi.array().items(Joi.object()),

  ico: Joi.object(),

  companies: Joi.array(),

  market_data: marketDataSchema,

  trans: Joi.array().items(
    Joi.object({
      lang: Joi.string()
        .valid(...Object.values(LANG_CODE))
        .required()
        .messages({
          'any.only': 'lang must be one of: ' + Object.values(LANG_CODE).join(', ') + ' or empty',
        }),
      about: Joi.string(),
      services: Joi.array().items(Joi.string()),
      features: Joi.array().items(Joi.string()),
    }),
  ),
  potential: Joi.string(),

  reliability: Joi.string(),

  rating: Joi.string(),

  years: Joi.number(),

  market: Joi.number(),

  market_share: Joi.number(),

  stage: Joi.string(),

  eco_market_cap: Joi.number(),

  backer: Joi.string(),

  fundraising: Joi.string(),

  community_vote: Joi.number(),

  token_allocation: Joi.array().items(
    Joi.object({
      name: Joi.string(),
      percent: Joi.number(),
      amount: Joi.number(),
    }),
  ),

  urls: urlsValidation,
});
export const AssetValidation = {
  create: validate({
    [Segments.BODY]: assetSchema,
  }),
  update: validate({
    [Segments.BODY]: assetSchema,
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
      community_vote_min: Joi.number(),
      community_vote_max: Joi.number(),
      // market_cap_min: Joi.number(),
      // market_cap_max: Joi.number(),
      // fully_diluted_market_cap_min: Joi.number(),
      // fully_diluted_market_cap_max: Joi.number(),
      backer: Joi.string().valid(...Object.values(BACKER)),
      development_status: Joi.string(),
      founded_from: Joi.number(),
      founded_to: Joi.number(),
    }),
  }),
  assetMetricQuery: validate({
    [Segments.QUERY]: BaseQueryValidation.keys({
      community_vote_min: Joi.number(),
      community_vote_max: Joi.number(),
      market_cap_min: Joi.number(),
      market_cap_max: Joi.number(),
      fully_diluted_market_cap_min: Joi.number(),
      fully_diluted_market_cap_max: Joi.number(),
      backer: Joi.string().valid(...Object.values(BACKER)),
      development_status: Joi.string(),
      founded_from: Joi.number(),
      founded_to: Joi.number(),
    }),
  }),
  search: validate({
    [Segments.QUERY]: BaseQueryValidation,
  }),
};
