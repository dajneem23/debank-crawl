import validate, { Joi, Segments } from '@/core/validation';
import { BaseQueryValidation, ObjectIdValidation, ORDER } from '@/types';
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
    [Segments.QUERY]: BaseQueryValidation.keys({
      type: [Joi.string(), Joi.array().items(Joi.string())],
      weight: Joi.number(),
    }),
  }),
  search: validate({
    [Segments.QUERY]: BaseQueryValidation.keys({
      type: [Joi.string(), Joi.array().items(Joi.string())],
      weight: Joi.number(),
    }),
  }),
  getById: validate({
    [Segments.PARAMS]: Joi.object({
      id: Joi.string(),
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
