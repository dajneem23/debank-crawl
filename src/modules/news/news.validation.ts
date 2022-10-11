import validate, { Joi, Segments } from '@/core/validation';
import {
  ORDER,
  CATEGORY_TYPE,
  LANG_CODE,
  NewsStatus,
  TopNewsDateRange,
  ObjectIdValidation,
  BaseQueryValidation,
} from '@/types';
import { ObjectIdPattern } from '@/utils/common';
export const NewsValidation = {
  create: validate({
    [Segments.BODY]: Joi.object({
      title: Joi.string().required(),

      content: Joi.string(),

      status: Joi.string().valid(...Object.values(NewsStatus)),

      headings: Joi.array().items(Joi.string()),

      summary: Joi.string(),

      photos: Joi.array().items(Joi.string()),

      categories: Joi.array().items(ObjectIdValidation),

      source: Joi.string(),

      number_relate_article: Joi.number(),

      trans: Joi.array().items(
        Joi.object({
          lang: Joi.string()
            .valid(...Object.values(LANG_CODE))
            .required()
            .messages({
              'any.only': 'lang must be one of: ' + Object.values(LANG_CODE).join(', ') + ' or empty',
            }),
          title: Joi.string(),
          content: Joi.string(),
          headings: Joi.array().items(Joi.string()),
          summary: Joi.string(),
        }),
      ),

      stars: Joi.number(),

      views: Joi.number(),

      keywords: Joi.array().items(Joi.string()),

      company_tags: Joi.array().items(ObjectIdValidation),

      coin_tags: Joi.array().items(ObjectIdValidation),

      product_tags: Joi.array().items(ObjectIdValidation),

      person_tags: Joi.array().items(ObjectIdValidation),

      event_tags: Joi.array().items(ObjectIdValidation),
    }),
  }),
  update: validate({
    [Segments.BODY]: Joi.object({
      title: Joi.string(),

      content: Joi.string(),

      status: Joi.string().valid(...Object.values(NewsStatus)),

      headings: Joi.array().items(Joi.string()),

      summary: Joi.string(),

      photos: Joi.array().items(Joi.string()),

      categories: Joi.array().items(ObjectIdValidation),

      source: Joi.string(),

      number_relate_article: Joi.number(),

      trans: Joi.array().items(
        Joi.object({
          lang: Joi.string()
            .valid(...Object.values(LANG_CODE))
            .required()
            .messages({
              'any.only': 'lang must be one of: ' + Object.values(LANG_CODE).join(', ') + ' or empty',
            }),
          title: Joi.string(),
          content: Joi.string(),
          headings: Joi.array().items(Joi.string()),
          summary: Joi.string(),
        }),
      ),

      stars: Joi.number(),

      views: Joi.number(),

      keywords: Joi.array().items(Joi.string()),

      company_tags: Joi.array().items(ObjectIdValidation),

      coin_tags: Joi.array().items(ObjectIdValidation),

      product_tags: Joi.array().items(ObjectIdValidation),

      person_tags: Joi.array().items(ObjectIdValidation),

      event_tags: Joi.array().items(ObjectIdValidation),
    }),
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
      status: Joi.string().valid(...Object.values(NewsStatus)),
      company_tags: Joi.array().items(ObjectIdValidation),
      coin_tags: Joi.array().items(ObjectIdValidation),
      product_tags: Joi.array().items(ObjectIdValidation),
      person_tags: Joi.array().items(ObjectIdValidation),
      event_tags: Joi.array().items(ObjectIdValidation),
    }),
  }),
  getRelated: validate({
    [Segments.QUERY]: BaseQueryValidation,
  }),
  getImportant: validate({
    [Segments.QUERY]: BaseQueryValidation,
  }),
  getTop: validate({
    [Segments.QUERY]: BaseQueryValidation.keys({
      date_range: Joi.string()
        .valid(...Object.keys(TopNewsDateRange))
        .default(TopNewsDateRange['1d']),
    }),
  }),
  updateStatus: validate({
    [Segments.PARAMS]: Joi.object({
      id: ObjectIdValidation,
    }),
    [Segments.QUERY]: Joi.object({
      status: Joi.string()
        .default(NewsStatus.DRAFT)
        .valid(...Object.values(NewsStatus))
        .required(),
    }),
  }),
  PreCheckStatus: validate({
    [Segments.PARAMS]: Joi.object({
      id: ObjectIdValidation,
    }),
  }),
};
