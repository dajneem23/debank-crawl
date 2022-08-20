import validate, { Joi, Segments } from '@/core/validation';
import { ORDER, CATEGORY_TYPE } from '@/types';
import { ObjectIdPattern } from '@/utils/common';
export const ProductValidation = {
  create: validate({
    [Segments.BODY]: Joi.object({
      name: Joi.string(),

      director: Joi.string(),

      contract_addresses: Joi.object(),

      crypto_currencies: Joi.array().items(Joi.string().regex(ObjectIdPattern)),

      //array id of categories
      categories: Joi.array().items(Joi.string().regex(ObjectIdPattern)),

      features: Joi.array().items(Joi.string()),

      token: Joi.string(),

      apps: Joi.array().items(Joi.object()),

      supports: Joi.array().items(Joi.object()),

      galleries: Joi.array().items(Joi.string()),

      informations: Joi.array().items(Joi.object()),

      team: Joi.array().items(Joi.object()),

      parent_company: Joi.string(),

      team_location: Joi.string(),

      location: Joi.string(),

      research_papers: Joi.array().items(Joi.object()),

      sponsored: Joi.boolean(),

      short_description: Joi.string(),

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

      director: Joi.string(),

      contract_addresses: Joi.object(),

      crypto_currencies: Joi.array().items(Joi.string().regex(ObjectIdPattern)),

      //array id of categories
      categories: Joi.array().items(Joi.string().regex(ObjectIdPattern)),

      software_license: Joi.string(),

      features: Joi.array().items(Joi.string()),

      token: Joi.string(),

      apps: Joi.array().items(Joi.object()),

      supports: Joi.array().items(Joi.object()),

      galleries: Joi.array().items(Joi.string()),

      informations: Joi.array().items(Joi.object()),

      team: Joi.array().items(Joi.object()),

      parent_company: Joi.string(),

      team_location: Joi.string(),

      location: Joi.string(),

      research_papers: Joi.array().items(Joi.object()),

      sponsored: Joi.boolean(),

      short_description: Joi.string(),

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
};
