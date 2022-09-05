import validate, { Joi, Segments } from '@/core/validation';
import { ORDER, EventType, MediaType } from '@/types/Common';
import { ObjectIdPattern, PhoneNumberPattern } from '@/utils/common';
export const query = validate({
  [Segments.QUERY]: Joi.object({
    page: Joi.number().default(1).min(1),

    per_page: Joi.number().default(10).min(1),

    sort_by: Joi.string(),

    sort_order: Joi.string()
      .default(ORDER.ASC)
      .valid(...Object.values(ORDER)),

    q: Joi.string(),

    category: Joi.string(),

    type: Joi.string(),

    country: Joi.string(),
  }),
});
export const search = validate({
  [Segments.QUERY]: Joi.object({
    page: Joi.number().default(1).min(1),

    per_page: Joi.number().default(10).min(1),

    sort_by: Joi.string(),

    sort_order: Joi.string()
      .default(ORDER.ASC)
      .valid(...Object.values(ORDER)),

    q: Joi.string().allow('').required(),
  }),
});
export const getRelated = validate({
  [Segments.QUERY]: Joi.object({
    page: Joi.number().default(1).min(1).required(),

    per_page: Joi.number().default(10).min(1).required(),

    sort_by: Joi.string(),

    sort_order: Joi.string()
      .default(ORDER.ASC)
      .valid(...Object.values(ORDER)),

    q: Joi.string(),

    category: Joi.string(),

    // cryptoAssetTags: [Joi.array().items(Joi.string()), Joi.string()],
  }),
});

export const getTrending = validate({
  [Segments.QUERY]: Joi.object({
    per_page: Joi.number().default(10).min(1).required(),

    sort_order: Joi.string()
      .default(ORDER.ASC)
      .valid(...Object.values(ORDER)),
  }),
});

export const getSignificant = validate({
  [Segments.QUERY]: Joi.object({
    page: Joi.number().default(1).min(1),

    per_page: Joi.number().default(10).min(1),

    sort_order: Joi.string()
      .default(ORDER.ASC)
      .valid(...Object.values(ORDER)),
  }),
});

export const create = validate({
  [Segments.BODY]: Joi.object({
    type: Joi.string()
      .valid(...Object.values(EventType))
      .required(),

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

    categories: Joi.array().items(Joi.string().regex(ObjectIdPattern)),

    country: Joi.string(),

    //array id of persons
    speakers: Joi.array().items(Joi.string().regex(ObjectIdPattern)),

    //array id of persons
    sponsors: Joi.array().items(Joi.string().regex(ObjectIdPattern)),

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

    subscribers: Joi.array().items(Joi.string().email()),

    slide: Joi.string(),

    recap: Joi.string(),

    banners: Joi.array().items(Joi.string()),

    media: Joi.array().items(
      Joi.object({
        type: Joi.string()
          .valid(...Object.values(MediaType))
          .required(),
        url: Joi.string().required(),
      }),
    ),
  }),
});
export const update = validate({
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

    categories: Joi.array().items(Joi.string().regex(ObjectIdPattern)),

    country: Joi.string(),

    //array id of persons
    speakers: Joi.array().items(Joi.string().regex(ObjectIdPattern)),

    //array id of persons
    sponsors: Joi.array().items(Joi.string().regex(ObjectIdPattern)),
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

    subscribers: Joi.array().items(Joi.string().email()),

    slide: Joi.string(),

    recap: Joi.string(),

    banners: Joi.array().items(Joi.string()),

    media: Joi.array().items(
      Joi.object({
        type: Joi.string()
          .valid(...Object.values(MediaType))
          .required(),
        url: Joi.string().required(),
      }),
    ),
  }),
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().regex(ObjectIdPattern),
  }),
});
export const getById = validate({
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().regex(ObjectIdPattern),
  }),
});

export const deleteById = validate({
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().regex(ObjectIdPattern),
  }),
});

export const updateTrending = validate({
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().regex(ObjectIdPattern),
  }),
  [Segments.BODY]: Joi.object({
    trending: Joi.boolean().required(),
  }),
});

export const updateSignificant = validate({
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().regex(ObjectIdPattern),
  }),
  [Segments.BODY]: Joi.object({
    significant: Joi.boolean().required(),
  }),
});

export const subscribe = validate({
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().regex(ObjectIdPattern),
  }),
  [Segments.BODY]: Joi.object({
    subscribers: [Joi.array().items(Joi.string().email()), Joi.string().email()],
  }),
});
