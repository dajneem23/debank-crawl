import validate, { Joi, Segments } from '@/core/validation';
import { ORDER, EventType, Sponsor, Agenda, BaseQuery } from '@/types/Common';
import { PhoneNumberPattern } from '@/utils/common';
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
    type: Joi.string().valid(...Object.values(EventType)),

    name: Joi.string(),

    email: Joi.string().email(),

    website: Joi.string(),

    introduction: Joi.string(),

    agenda: Joi.array().items(
      Joi.object({
        time: Joi.date(),
        description: Joi.string(),
      }),
    ),

    location: Joi.object(), // Map API

    start_date: Joi.date(),

    end_date: Joi.date(),

    categories: Joi.array().items(Joi.string()),

    country: Joi.string(),

    //array id of persons
    speakers: Joi.array().items(Joi.string()),

    //array id of persons
    sponsors: Joi.array().items(
      Joi.object({
        id: Joi.string(),
        name: Joi.string(),
        type: Joi.string(),
      }),
    ),
    tel: Joi.string().regex(PhoneNumberPattern),

    avatar: Joi.string(),

    about: Joi.string(),

    twitter: Joi.string(),

    telegram: Joi.string(),

    facebook: Joi.string(),

    instagram: Joi.string(),

    linkedin: Joi.string(),

    github: Joi.string(),

    medium: Joi.string(),

    youtube: Joi.string(),

    blog: Joi.string(),

    reddit: Joi.string(),
  }),
});
