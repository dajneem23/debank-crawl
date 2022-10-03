import validate, { Joi, Segments } from '@/core/validation';
import { ObjectIdValidation, ORDER } from '@/types';
import { ObjectIdPattern } from '@/utils/common';
const SettingSchema = Joi.object({
  title: Joi.string().required(),
  type: Joi.string().required(),
  weight: Joi.number(),
  content: Joi.object().required(),
});

export const SettingValidation = {
  create: validate({
    [Segments.BODY]: SettingSchema,
  }),
  update: validate({
    [Segments.BODY]: SettingSchema,
    [Segments.PARAMS]: Joi.object({
      id: ObjectIdValidation,
    }),
  }),
  delete: validate({
    [Segments.PARAMS]: Joi.object({
      id: ObjectIdValidation,
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
      type: [Joi.string(), Joi.array().items(Joi.string())],
      weight: Joi.number(),
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
      type: [Joi.string(), Joi.array().items(Joi.string())],
      weight: Joi.number(),
      q: Joi.string().required().allow(''),
    }),
  }),
  getById: validate({
    [Segments.PARAMS]: Joi.object({
      id: Joi.string().required().pattern(new RegExp(ObjectIdPattern)).message('id must be a valid ObjectId'),
    }),
  }),
  getByName: validate({
    [Segments.PARAMS]: Joi.object({
      name: Joi.string().required(),
    }),
    [Segments.QUERY]: Joi.object({
      type: Joi.string(),
    }),
  }),
};
