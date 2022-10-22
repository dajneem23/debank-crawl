import validate, { Joi, Segments } from '@/core/validation';
import { ObjectIdValidation } from '@/types';
export const CommentValidation = {
  update: validate({
    [Segments.PARAMS]: Joi.object({
      id: ObjectIdValidation.required(),
    }),
    [Segments.BODY]: Joi.object({
      content: Joi.string().required(),
    }),
  }),

  delete: validate({
    [Segments.PARAMS]: Joi.object({
      id: ObjectIdValidation.required(),
    }),
  }),
};
