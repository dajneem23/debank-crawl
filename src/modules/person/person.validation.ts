import validate, { Joi, Segments } from '@/core/validation';
import { ORDER, CATEGORY_TYPE } from '@/types';
import { ObjectIdPattern } from '@/utils/common';
export const PersonValidation = {
  create: validate({
    [Segments.BODY]: Joi.object({
      name: Joi.string(),
      position: Joi.string(),
      categories: Joi.array().items(Joi.string().regex(ObjectIdPattern)),
      works: Joi.array().items(
        Joi.object({
          title: Joi.string(),
          description: Joi.string(),
          company: Joi.string(),
          position: Joi.string(),
          date_start: Joi.date(),
          date_end: Joi.date(),
          type: Joi.string(),
        }),
      ),
      educations: Joi.array().items(
        Joi.object({
          title: Joi.string(),
          description: Joi.string(),
        }),
      ),
      twitter: Joi.string(),

      telegram: Joi.string(),

      facebook: Joi.string(),

      instagram: Joi.string(),

      linkedin: Joi.string(),

      github: Joi.string(),

      medium: Joi.string(),

      youtube: Joi.string(),

      website: Joi.string(),

      blog: Joi.string(),

      email: Joi.string(),

      tel: Joi.string(),

      about: Joi.string(),

      avatar: Joi.string(),

      rocket_chat: Joi.string(),

      bitcoin_talk: Joi.string(),
    }),
  }),
  update: validate({
    [Segments.BODY]: Joi.object({
      name: Joi.string(),
      position: Joi.string(),
      categories: Joi.array().items(Joi.string().regex(ObjectIdPattern)),
      works: Joi.array().items(
        Joi.object({
          title: Joi.string(),
          description: Joi.string(),
          company: Joi.string(),
          position: Joi.string(),
          date_start: Joi.date(),
          date_end: Joi.date(),
          type: Joi.string(),
        }),
      ),
      educations: Joi.array().items(
        Joi.object({
          title: Joi.string(),
          description: Joi.string(),
        }),
      ),

      twitter: Joi.string(),

      telegram: Joi.string(),

      facebook: Joi.string(),

      instagram: Joi.string(),

      linkedin: Joi.string(),

      github: Joi.string(),

      medium: Joi.string(),

      youtube: Joi.string(),

      website: Joi.string(),

      blog: Joi.string(),

      email: Joi.string(),

      tel: Joi.string(),

      about: Joi.string(),

      avatar: Joi.string(),

      rocket_chat: Joi.string(),

      bitcoin_talk: Joi.string(),
    }),
    [Segments.PARAMS]: Joi.object({
      id: Joi.string().regex(ObjectIdPattern).required(),
    }),
  }),
  delete: validate({
    [Segments.PARAMS]: Joi.object({
      id: Joi.string().regex(ObjectIdPattern).required(),
    }),
  }),
  getById: validate({
    [Segments.PARAMS]: Joi.object({
      id: Joi.string().regex(ObjectIdPattern).required(),
    }),
  }),
  query: validate({
    [Segments.QUERY]: Joi.object({
      page: Joi.number().default(1).min(1),
      per_page: Joi.number().default(10).min(1),
      sort_by: Joi.string(),
      sort_order: Joi.string()
        .default(ORDER.ASC)
        .valid(...Object.values(ORDER)),
      q: Joi.string(),
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
      q: Joi.string().required(),
    }),
  }),
};
