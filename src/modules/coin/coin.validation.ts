import validate, { Joi, Segments } from '@/core/validation';
import {
  ORDER,
  CATEGORY_TYPE,
  LANG_CODE,
  coinSortBy,
  BACKER,
  DEVELOPMENT_STATUS,
  CONVERT_CURRENCY_CODE,
  ObjectIdValidation,
} from '@/types';
import { ObjectIdPattern } from '@/utils/common';
import { mapValues } from 'lodash';
const priceSchema = Joi.object({
  date: Joi.date(),
  value: Joi.number(),
});

const convertCurrencySchema = Joi.object({
  open: Joi.number(),
  high: Joi.number(),
  low: Joi.number(),
  close: Joi.number(),
  volume: Joi.number(),
  market_cap: Joi.number(),
  market_cap_dominance: Joi.number(),
  fully_diluted_market_cap: Joi.number(),
  price: Joi.number(),
  volume_change_24h: Joi.number(),
  percent_change_1h: Joi.number(),
  latest_price_1h: Joi.array().items(Joi.number()),
  percent_change_24h: Joi.number(),
  latest_price_24h: Joi.array().items(Joi.number()),
  percent_change_7d: Joi.number(),
  latest_price_7d: Joi.array().items(Joi.number()),
  volume_24h: Joi.number(),
  volume_7d: Joi.number(),
  volume_30d: Joi.number(),
  list_price: Joi.array().items(priceSchema),
  list_price_1h: Joi.array().items(priceSchema),
  list_price_24h: Joi.array().items(priceSchema),
  list_price_7d: Joi.array().items(priceSchema),
  last_updated: Joi.date(),
  tvl: Joi.number(),
  long: Joi.number(),
  short: Joi.number(),
  market_cap_by_total_supply: Joi.number(),
  volume_24h_reported: Joi.number(),
  volume_7d_reported: Joi.number(),
  volume_30d_reported: Joi.number(),
  percent_change_30d: Joi.number(),
  percent_change_60d: Joi.number(),
  percent_change_90d: Joi.number(),
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
const coinSchema = Joi.object({
  name: Joi.string(),

  token_id: Joi.string(),

  //array id of categories
  categories: Joi.array().items(
    Joi.string().pattern(new RegExp(ObjectIdPattern)).message('id must be a valid ObjectId'),
  ),

  explorer: Joi.string(),

  stack_exchange: Joi.string(),

  blockchains: Joi.array().items(Joi.string()),

  whitepaper: Joi.string(),

  wallets: Joi.array().items(Joi.string()),

  exchanges: Joi.array().items(Joi.string()),

  technologies: Joi.object(),

  features: Joi.array().items(Joi.string()),

  services: Joi.array().items(Joi.string()),

  team: Joi.array().items(Joi.object()),

  ico: Joi.object(),

  twitter: Joi.string(),

  telegram: Joi.string(),

  facebook: Joi.string(),

  instagram: Joi.string(),

  linkedin: Joi.string(),

  github: Joi.string(),

  medium: Joi.string(),

  youtube: Joi.string(),

  website: Joi.string(),

  blog: Joi.string(),

  email: Joi.string(),

  tel: Joi.string(),

  about: Joi.string(),

  avatar: Joi.string(),

  rocket_chat: Joi.string(),

  bitcoin_talk: Joi.string(),

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

  token_allocation: Joi.array().items(
    Joi.object({
      name: Joi.string(),
      percent: Joi.number(),
      amount: Joi.number(),
    }),
  ),
});
export const CoinValidation = {
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
      sort_by: Joi.string()
        .default('created_at')
        .valid(...Object.keys(coinSortBy)),
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
