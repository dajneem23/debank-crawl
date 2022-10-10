import validate, { Joi, Segments } from '@/core/validation';
import { ORDER, CATEGORY_TYPE, LANG_CODE, ObjectIdValidation, BaseQueryValidation } from '@/types';
import { ObjectIdPattern } from '@/utils/common';
const categorySchema = Joi.object({
  title: Joi.string().required(),
  type: Joi.string()
    .valid(...Object.values(CATEGORY_TYPE))
    .required(),
  weight: Joi.number(),
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
  sub_categories: Joi.array().items(Joi.link('/')),
});

export const CategoryValidation = {
  create: validate({
    [Segments.BODY]: categorySchema,
  }),
  update: validate({
    [Segments.BODY]: categorySchema,
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
      type: [
        Joi.string().valid(...Object.values(CATEGORY_TYPE)),
        Joi.array().items(Joi.string().valid(...Object.values(CATEGORY_TYPE))),
      ],
      rank: Joi.number(),
    }),
  }),
  search: validate({
    [Segments.QUERY]: BaseQueryValidation.keys({
      type: [
        Joi.string().valid(...Object.values(CATEGORY_TYPE)),
        Joi.array().items(Joi.string().valid(...Object.values(CATEGORY_TYPE))),
      ],
      rank: Joi.number(),
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
      lang: Joi.string()
        .valid(...Object.values(LANG_CODE))
        .messages({
          'any.only': 'lang must be one of: ' + Object.values(LANG_CODE).join(', ') + ' or empty',
        }),
      type: Joi.string().valid(...Object.values(CATEGORY_TYPE)),
    }),
  }),
};
