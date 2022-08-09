import validate, { Joi, Segments } from '@/core/validation';

export const shippingAddressSchema = Joi.object({
  name: Joi.string().required(),
  phone: Joi.string().required(),
  address: Joi.string().required(),
  country: Joi.string().valid('VN').required(),
  province: Joi.string().required(),
  district: Joi.string().required(),
  ward: Joi.string().required(),
  geoinfo: Joi.object({
    formatted_address: Joi.string().allow(''),
    place_id: Joi.string().allow(''),
    region: Joi.object({
      latitude: Joi.number(),
      longitude: Joi.number(),
    }).required(),
  }),
});

export const query = validate({
  [Segments.QUERY]: Joi.object({
    page: Joi.number().default(1),
    per_page: Joi.number().default(10),
    sort_by: Joi.string(),
    sort_order: Joi.string().valid('desc', 'asc'),
  }),
});

export const createUpdate = validate({
  [Segments.BODY]: shippingAddressSchema.append({
    is_delivery_address: Joi.boolean().required(),
  }),
});

export const queryDistrictWard = validate({
  [Segments.QUERY]: Joi.object({
    code: Joi.string().required(),
  }),
});
