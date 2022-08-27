import validate, { Joi, Segments } from '@/core/validation';
import { ORDER, CATEGORY_TYPE } from '@/types';
import { ObjectIdPattern } from '@/utils/common';
export const NewsValidation = {
  create: validate({
    [Segments.BODY]: Joi.object({
      slug: Joi.string().required(),

      photos: Joi.array().items(Joi.string()),

      categories: Joi.array().items(Joi.string()),

      source: Joi.string(),

      number_relate_article: Joi.number(),

      contents: Joi.array().items(
        Joi.object({
          title: Joi.string().required(),
          lang: Joi.string().required(),
          content: Joi.string().required(),
          headings: Joi.array().items(Joi.string()).required(),
          summary: Joi.string().required(),
        }),
      ),

      stars: Joi.number(),

      views: Joi.number(),

      keywords: Joi.array().items(Joi.string()),

      company_tags: Joi.array().items(Joi.string()),

      coin_tags: Joi.array().items(Joi.string()),
    }),
  }),
  update: validate({
    [Segments.BODY]: Joi.object({
      name: Joi.string().required(),

      photos: Joi.array().items(Joi.string()),

      categories: Joi.array().items(Joi.string()),

      number_relate_article: Joi.number(),

      source: Joi.string(),

      contents: Joi.array().items(
        Joi.object({
          title: Joi.string().required(),
          lang: Joi.string(),
          content: Joi.string(),
          headings: Joi.array().items(Joi.string()),
          summary: Joi.string(),
        }),
      ),

      views: Joi.number(),

      keywords: Joi.array().items(Joi.string()),

      company_tags: Joi.array().items(Joi.string()),

      coin_tags: Joi.array().items(Joi.string()),
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
      lang: Joi.string().required(),
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
      lang: Joi.string().required(),
      category: [Joi.array().items(Joi.string()), Joi.string()],
    }),
  }),
  getRelated: validate({
    [Segments.QUERY]: Joi.object({
      page: Joi.number().default(1).min(1),
      per_page: Joi.number().default(10).min(1),
      sort_by: Joi.string(),
      sort_order: Joi.string()
        .default(ORDER.ASC)
        .valid(...Object.values(ORDER)),
      q: Joi.string(),
      lang: Joi.string().required(),
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
      lang: Joi.string().required(),
    }),
  }),
};
