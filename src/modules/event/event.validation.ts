import validate, { Joi, Segments } from '@/core/validation';
import { ORDER, EventType, MediaType, LANG_CODE, ObjectIdValidation } from '@/types/Common';
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

    categories: Joi.array().items(ObjectIdValidation),

    type: [
      Joi.string().valid(...Object.values(EventType)),
      Joi.array().items(Joi.string().valid(...Object.values(EventType))),
    ],

    start_date: Joi.date(),

    end_date: Joi.date(),

    country: Joi.string(),

    lang: Joi.string()
      .valid(...Object.values(LANG_CODE))
      .messages({
        'any.only': 'lang must be one of: ' + Object.values(LANG_CODE).join(', ') + ' or empty',
      }),
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

    lang: Joi.string()
      .valid(...Object.values(LANG_CODE))
      .messages({
        'any.only': 'lang must be one of: ' + Object.values(LANG_CODE).join(', ') + ' or empty',
      }),
  }),
});
export const getRelated = validate({
  [Segments.QUERY]: Joi.object({
    page: Joi.number().default(1).min(1),

    per_page: Joi.number().default(10).min(1),

    sort_by: Joi.string(),

    sort_order: Joi.string()
      .default(ORDER.ASC)
      .valid(...Object.values(ORDER)),

    q: Joi.string(),

    categories: Joi.array().items(ObjectIdValidation),

    lang: Joi.string()
      .valid(...Object.values(LANG_CODE))
      .messages({
        'any.only': 'lang must be one of: ' + Object.values(LANG_CODE).join(', ') + ' or empty',
      }),
  }),
});

export const getTrending = validate({
  [Segments.QUERY]: Joi.object({
    per_page: Joi.number().default(10).min(1),

    sort_order: Joi.string()
      .default(ORDER.ASC)
      .valid(...Object.values(ORDER)),

    lang: Joi.string()
      .valid(...Object.values(LANG_CODE))
      .messages({
        'any.only': 'lang must be one of: ' + Object.values(LANG_CODE).join(', ') + ' or empty',
      }),
  }),
});

export const getSignificant = validate({
  [Segments.QUERY]: Joi.object({
    page: Joi.number().default(1).min(1),

    per_page: Joi.number().default(10).min(1),

    sort_order: Joi.string()
      .default(ORDER.ASC)
      .valid(...Object.values(ORDER)),

    lang: Joi.string()
      .valid(...Object.values(LANG_CODE))
      .messages({
        'any.only': 'lang must be one of: ' + Object.values(LANG_CODE).join(', ') + ' or empty',
      }),
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

    categories: Joi.array().items(ObjectIdValidation),

    country: Joi.string(),

    //array id of persons
    speakers: Joi.array().items(ObjectIdValidation),

    fund_sponsors: Joi.array().items(ObjectIdValidation),

    person_sponsors: Joi.array().items(ObjectIdValidation),

    company_sponsors: Joi.array().items(ObjectIdValidation),

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
    trans: Joi.array().items(
      Joi.object({
        lang: Joi.string()
          .valid(...Object.values(LANG_CODE))
          .required()
          .messages({
            'any.only': 'lang must be one of: ' + Object.values(LANG_CODE).join(', ') + ' or empty',
          }),
        name: Joi.string(),
        introduction: Joi.string(),
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

    categories: Joi.array().items(ObjectIdValidation),

    country: Joi.string(),

    //array id of persons
    speakers: Joi.array().items(ObjectIdValidation),

    fund_sponsors: Joi.array().items(ObjectIdValidation),

    person_sponsors: Joi.array().items(ObjectIdValidation),

    company_sponsors: Joi.array().items(ObjectIdValidation),

    tel: Joi.string().pattern(new RegExp(PhoneNumberPattern)).message('Invalid phone number'),

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

    trans: Joi.array().items(
      Joi.object({
        lang: Joi.string()
          .valid(...Object.values(LANG_CODE))
          .required()
          .messages({
            'any.only': 'lang must be one of: ' + Object.values(LANG_CODE).join(', ') + ' or empty',
          }),
        name: Joi.string(),
        introduction: Joi.string(),
      }),
    ),
  }),
  [Segments.PARAMS]: Joi.object({
    id: ObjectIdValidation,
  }),
});
export const getById = validate({
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
});
export const getBySlug = validate({
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
});
export const deleteById = validate({
  [Segments.PARAMS]: Joi.object({
    id: ObjectIdValidation,
  }),
});

export const updateTrending = validate({
  [Segments.PARAMS]: Joi.object({
    id: ObjectIdValidation,
  }),
  [Segments.BODY]: Joi.object({
    trending: Joi.boolean().required(),
  }),
});

export const updateSignificant = validate({
  [Segments.PARAMS]: Joi.object({
    id: ObjectIdValidation,
  }),
  [Segments.BODY]: Joi.object({
    significant: Joi.boolean().required(),
  }),
});

export const subscribe = validate({
  [Segments.PARAMS]: Joi.object({
    id: ObjectIdValidation,
  }),
  [Segments.BODY]: Joi.object({
    subscribers: [Joi.array().items(Joi.string().email()), Joi.string().email()],
  }),
});
