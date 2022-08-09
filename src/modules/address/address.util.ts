import { WithId } from 'mongodb';
import { omit, pick } from 'lodash';
import {
  BaseAddress,
  ShippingAddress,
  UserAddress,
  UserAddressOutput,
  UserAddressPublicResponse,
  WithoutMongoGeo,
} from '@/modules/address/address.type';

export const toUserAddressOutput = (item: UserAddress | WithId<UserAddress>): UserAddressOutput => {
  if (!item) return undefined;
  return omit(item, '_id', 'mongodb_geo');
};

export const toShippingAddress = (
  item: UserAddress | WithId<UserAddress> | WithoutMongoGeo<ShippingAddress>,
): ShippingAddress => {
  if (!item) return undefined;
  return omit(item, '_id', 'user_id', 'is_delivery_address', 'mongodb_geo', 'created_at', 'updated_at');
};

export const toUserAddressPublicResponse = (item: BaseAddress): UserAddressPublicResponse => {
  return pick(item, 'id', 'country', 'province', 'district', 'ward');
};

/**
 * Build MongoDB Geospatial from geoInfo
 */
export const buildMongodbGeospatial = (geoinfo?: UserAddress['geoinfo']): UserAddress['mongodb_geo'] | undefined => {
  if (!geoinfo?.region?.longitude || !geoinfo?.region?.latitude) return undefined;
  return {
    type: 'Point',
    coordinates: [geoinfo.region.longitude, geoinfo.region.latitude],
  };
};

/**
 * Build a full address string (e.g. Nguyễn Đình Bình, 0977979079 - Chung cư Celadon, 36 Bờ bao tân thắng, P. Sơn Kỳ, Q. Tân Phú, HCM)
 */
export const buildFullAddress = (shippingAddress: ShippingAddress) => {
  const { name, phone, address, ward, district, province } = shippingAddress;
  return `${name}, ${phone} - ${address}, ${ward}, ${district}, ${province}`;
};

/**
 * Build a minimal address string (e.g. P. Sơn Kỳ, Q. Tân Phú, HCM)
 */
export const buildMinimalAddress = (shippingAddress: ShippingAddress) => {
  const { ward, district, province } = shippingAddress;
  return `${ward}, ${district}, ${province}`;
};
