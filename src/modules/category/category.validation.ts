import validate, { Joi, Segments } from '@/core/validation';
import { CATEGORY_TYPE } from '@/types/Common';

export const query = validate({
  [Segments.QUERY]: Joi.object({
    type: Joi.string().valid(CATEGORY_TYPE.EVENT, CATEGORY_TYPE.LISTENING, CATEGORY_TYPE.WIKIBLOCK).required(),
  }),
});

export const create = validate({
  [Segments.BODY]: Joi.object({
    type: Joi.string().valid(CATEGORY_TYPE.EVENT, CATEGORY_TYPE.LISTENING, CATEGORY_TYPE.WIKIBLOCK).required(),
    title: Joi.string().required(),
    weight: Joi.number(),
  }),
});

export const update = validate({
  [Segments.BODY]: Joi.object({
    title: Joi.string().required(),
    weight: Joi.number(),
  }),
});
