import validate, { Joi, Segments } from '@/core/validation';
import { ORDER, CATEGORY_TYPE, LANG_CODE, coinSortBy } from '@/types';
import { ObjectIdPattern } from '@/utils/common';
const priceSchema = Joi.object({
  date: Joi.date(),
  value: Joi.number(),
});
const marketDataSchema = Joi.object({
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
  percent_change_90d: Joi.number(),
  list_price: Joi.array().items(priceSchema),
  list_price_1h: Joi.array().items(priceSchema),
  list_price_24h: Joi.array().items(priceSchema),
  list_price_7d: Joi.array().items(priceSchema),
  last_updated: Joi.date(),
  tvl: Joi.number(),
  long: Joi.number(),
  short: Joi.number(),
});
export const CoinValidation = {
  create: validate({
    [Segments.BODY]: Joi.object({
      name: Joi.string(),

      token_id: Joi.string(),

      //array id of categories
      categories: Joi.array().items(Joi.string().regex(ObjectIdPattern)),

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

      market_data: Joi.object().keys({
        USD: marketDataSchema,
      }),

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
    }),
  }),
  update: validate({
    [Segments.BODY]: Joi.object({
      name: Joi.string(),

      token_id: Joi.string(),

      //array id of categories
      categories: Joi.array().items(Joi.string().regex(ObjectIdPattern)),

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

      market_data: Joi.object().keys({
        USD: marketDataSchema,
      }),

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

      development_status: Joi.string(),

      stage: Joi.string(),

      eco_market_cap: Joi.number(),

      backer: Joi.string(),

      fundraising: Joi.string(),
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
