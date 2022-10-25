import validate, { Joi, Segments } from '@/core/validation';
import { ORDER, LANG_CODE, ObjectIdValidation, BaseQueryValidation } from '@/types';
export const GlossaryValidation = {
  create: validate({
    [Segments.BODY]: Joi.object({
      name: Joi.string().required(),

      define: Joi.string().required(),

      trans: Joi.array().items(
        Joi.object({
          lang: Joi.string()
            .valid(...Object.values(LANG_CODE))
            .required()
            .messages({
              'any.only': 'lang must be one of: ' + Object.values(LANG_CODE).join(', ') + ' or empty',
            }),
          define: Joi.string(),
          name: Joi.string(),
        }),
      ),
      categories: Joi.array().items(ObjectIdValidation),
      type: Joi.string(),
    }),
  }),
  update: validate({
    [Segments.BODY]: Joi.object({
      name: Joi.string().required(),

      define: Joi.string().required(),

      trans: Joi.array().items(
        Joi.object({
          lang: Joi.string()
            .valid(...Object.values(LANG_CODE))
            .required()
            .messages({
              'any.only': 'lang must be one of: ' + Object.values(LANG_CODE).join(', ') + ' or empty',
            }),
          define: Joi.string(),
          name: Joi.string(),
        }),
      ),
      categories: Joi.array().items(ObjectIdValidation),
      type: Joi.string(),
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
    [Segments.QUERY]: BaseQueryValidation,
  }),
  search: validate({
    [Segments.QUERY]: BaseQueryValidation,
  }),
};
