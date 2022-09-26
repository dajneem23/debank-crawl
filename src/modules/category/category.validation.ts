import validate, { Joi, Segments } from '@/core/validation';
import { ORDER, CATEGORY_TYPE, LANG_CODE } from '@/types';
import { ObjectIdPattern } from '@/utils/common';
export const CategoryValidation = {
  create: validate({
    [Segments.BODY]: Joi.object({
      title: Joi.string().required(),
      name: Joi.string().required(),
      acronym: Joi.string(),
      weight: Joi.number().required(),
      sub_categories: Joi.array().items(Joi.string().pattern(ObjectIdPattern)),
      type: Joi.string()
        .valid(...Object.values(CATEGORY_TYPE))
        .required(),
      trans: Joi.array().items(
        Joi.object({
          lang: Joi.string()
            .valid(...Object.values(LANG_CODE))
            .required()
            .messages({
              'any.only': 'lang must be one of: ' + Object.values(LANG_CODE).join(', ') + ' or empty',
            }),
          title: Joi.string(),
          name: Joi.string(),
        }),
      ),
    }),
  }),
  update: validate({
    [Segments.BODY]: Joi.object({
      title: Joi.string(),
      weight: Joi.number(),
      name: Joi.string(),
      sub_categories: Joi.array().items(Joi.string().pattern(ObjectIdPattern)),
      acronym: Joi.string(),
      type: Joi.string().valid(...Object.values(CATEGORY_TYPE)),
      trans: Joi.array().items(
        Joi.object({
          lang: Joi.string()
            .valid(...Object.values(LANG_CODE))
            .required()
            .messages({
              'any.only': 'lang must be one of: ' + Object.values(LANG_CODE).join(', ') + ' or empty',
            }),
          title: Joi.string(),
          name: Joi.string(),
        }),
      ),
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
  query: validate({
    [Segments.QUERY]: Joi.object({
      q: Joi.string(),
      page: Joi.number().default(1).min(1),
      per_page: Joi.number().default(10).min(1),
      sort_by: Joi.string(),
      sort_order: Joi.string()
        .default(ORDER.ASC)
        .valid(...Object.values(ORDER)),
      type: [
        Joi.string().valid(...Object.values(CATEGORY_TYPE)),
        Joi.array().items(Joi.string().valid(...Object.values(CATEGORY_TYPE))),
      ],
      rank: Joi.number(),
      lang: Joi.string()
        .valid(...Object.values(LANG_CODE))
        .messages({
          'any.only': 'lang must be one of: ' + Object.values(LANG_CODE).join(', ') + ' or empty',
        }),
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
      type: [
        Joi.string().valid(...Object.values(CATEGORY_TYPE)),
        Joi.array().items(Joi.string().valid(...Object.values(CATEGORY_TYPE))),
      ],
      rank: Joi.number(),
      lang: Joi.string()
        .valid(...Object.values(LANG_CODE))
        .messages({
          'any.only': 'lang must be one of: ' + Object.values(LANG_CODE).join(', ') + ' or empty',
        }),
      q: Joi.string().required(),
    }),
  }),
  getById: validate({
    [Segments.PARAMS]: Joi.object({
      id: Joi.string().required().regex(ObjectIdPattern),
    }),
  }),
  getByName: validate({
    [Segments.PARAMS]: Joi.object({
      name: Joi.string().required(),
    }),
    [Segments.QUERY]: Joi.object({
      lang: Joi.string()
        .valid(...Object.values(LANG_CODE))
        .messages({
          'any.only': 'lang must be one of: ' + Object.values(LANG_CODE).join(', ') + ' or empty',
        }),
      type: Joi.string().valid(...Object.values(CATEGORY_TYPE)),
    }),
  }),
};
