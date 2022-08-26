import validate, { Joi, Segments } from '@/core/validation';
import { ORDER, CATEGORY_TYPE } from '@/types';
import { ObjectIdPattern } from '@/utils/common';
export const CategoryValidation = {
  create: validate({
    [Segments.BODY]: Joi.object({
      title: Joi.string().required(),
      name: Joi.string().required(),
      acronym: Joi.string(),
      weight: Joi.number().required(),
      type: Joi.string()
        .valid(...Object.values(CATEGORY_TYPE))
        .required(),
    }),
  }),
  update: validate({
    [Segments.BODY]: Joi.object({
      title: Joi.string(),
      weight: Joi.number(),
      name: Joi.string(),
      acronym: Joi.string(),
      type: Joi.string().valid(...Object.values(CATEGORY_TYPE)),
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
    }),
  }),
  getById: validate({
    [Segments.PARAMS]: Joi.object({
      id: Joi.string().regex(ObjectIdPattern),
    }),
  }),
};
