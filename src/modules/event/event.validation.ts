import validate, { Joi, Segments } from '@/core/validation';
import { ORDER } from '@/types/Common';

export const query = validate({
  [Segments.QUERY]: Joi.object({
    page: Joi.number().default(1).min(1).required(),

    perPage: Joi.number().default(10).min(1).required(),

    sortBy: Joi.string(),

    sortOrder: Joi.string().default(ORDER.ASC).valid(ORDER.ASC, ORDER.DESC),

    q: Joi.string(),

    category: Joi.string(),

    cryptoAssetTags: Joi.array().items(Joi.string()),
  }),
});
export const getRelated = validate({
  [Segments.QUERY]: Joi.object({
    page: Joi.number().default(1).min(1).required(),

    perPage: Joi.number().default(10).min(1).required(),

    sortBy: Joi.string(),

    sortOrder: Joi.string().default(ORDER.ASC).valid(ORDER.ASC, ORDER.DESC),

    q: Joi.string(),

    category: Joi.string(),

    cryptoAssetTags: Joi.array().items(Joi.string()),
  }),
});
