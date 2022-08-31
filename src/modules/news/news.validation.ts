import validate, { Joi, Segments } from '@/core/validation';
import { ORDER, CATEGORY_TYPE, LANG_CODE, NewsStatus } from '@/types';
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

      categories: Joi.array().items(Joi.string()),

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

      company_tags: Joi.array().items(Joi.string().regex(ObjectIdPattern)),

      coin_tags: Joi.array().items(Joi.string().regex(ObjectIdPattern)),

      product_tags: Joi.array().items(Joi.string().regex(ObjectIdPattern)),
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

      categories: Joi.array().items(Joi.string()),

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

      company_tags: Joi.array().items(Joi.string().regex(ObjectIdPattern)),

      coin_tags: Joi.array().items(Joi.string().regex(ObjectIdPattern)),

      product_tags: Joi.array().items(Joi.string().regex(ObjectIdPattern)),
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
      category: [Joi.array().items(Joi.string()), Joi.string()],
      status: Joi.string().valid(...Object.values(NewsStatus)),
    }),
  }),
  getRelated: validate({
    [Segments.QUERY]: Joi.object({
      page: Joi.number().default(1).min(1),
      per_page: Joi.number().default(10).min(1),
      // sort_by: Joi.string(),
      // sort_order: Joi.string()
      //   .default(ORDER.ASC)
      //   .valid(...Object.values(ORDER)),
      q: Joi.string(),
      lang: Joi.string()
        .valid(...Object.values(LANG_CODE))
        .messages({
          'any.only': 'lang must be one of: ' + Object.values(LANG_CODE).join(', ') + ' or empty',
        }),
    }),
  }),
  getImportant: validate({
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
    }),
  }),
  updateStatus: validate({
    [Segments.PARAMS]: Joi.object({
      id: Joi.string().regex(ObjectIdPattern).required(),
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
      id: Joi.string().regex(ObjectIdPattern).required(),
    }),
  }),
};
