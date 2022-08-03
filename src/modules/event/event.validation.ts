import validate, { Joi, Segments } from '@/core/validation';

export const query = validate({
  [Segments.QUERY]: Joi.object({}),
});
