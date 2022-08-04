import validate, { Joi, Segments } from '@/core/validation';
import { ORDER } from '@/types/Common';
import { EventType } from '@/modules/event/event.type';
export const query = validate({
  [Segments.QUERY]: Joi.object({
    page: Joi.number().default(1).min(1).required(),

    perPage: Joi.number().default(10).min(1).required(),

    sortBy: Joi.string(),

    sortOrder: Joi.string()
      .default(ORDER.ASC)
      .valid(...Object.values(ORDER)),

    country: Joi.string(),

    q: Joi.string(),

    category: Joi.string(),

    cryptoAssetTags: [Joi.array().items(Joi.string()), Joi.string()],
  }),
});
export const getRelated = validate({
  [Segments.QUERY]: Joi.object({
    page: Joi.number().default(1).min(1).required(),

    perPage: Joi.number().default(10).min(1).required(),

    sortBy: Joi.string(),

    sortOrder: Joi.string()
      .default(ORDER.ASC)
      .valid(...Object.values(ORDER)),

    q: Joi.string(),

    category: Joi.string(),

    cryptoAssetTags: [Joi.array().items(Joi.string()), Joi.string()],
  }),
});
export const create = validate({
  [Segments.BODY]: Joi.object({
    name: Joi.string().required(),

    introduction: Joi.string().required(),

    type: Joi.string()
      .valid(...Object.values(EventType))
      .required(),

    email: Joi.string().email(),

    startDate: Joi.date().required(),

    endDate: Joi.date().required(),

    map: Joi.object(),

    medias: Joi.object(),

    socialProfiles: Joi.object(),

    agenda: Joi.object(),

    phone: Joi.string(),

    website: Joi.string(),

    country: Joi.string(),

    speakers: Joi.array().items(Joi.object()),

    sponsors: Joi.array().items(Joi.object()),

    categories: Joi.array().items(Joi.object()),

    cryptoAssetTags: Joi.array().items(Joi.object()),
  }),
});
