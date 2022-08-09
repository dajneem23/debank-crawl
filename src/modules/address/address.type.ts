export type WithMongoGeo<T> = T & {
  // MongoDB Geospatial
  mongodb_geo?: {
    type: 'Point';
    coordinates: [number, number]; // [long, lat]
  };
};

export type WithoutMongoGeo<T> = Omit<T, 'mongodb_geo'>;

export interface BaseAddress {
  // Address ID
  id: string;
  // Country (e.g. VN)
  country: string;
  // Province name (e.g. Tp.Ho Chi Minh)
  province: string;
  // District name (e.g. Quan 1)
  district: string;
  // Ward name (e.g. Phuong Ben Nghe)
  ward: string;
  // Address street name (e.g. 01 Cong xa Paris)
  address: string;
  // The postal code
  postal_code?: string;
  // Geolocation info
  geoinfo?: {
    place_id: string;
    formatted_address: string;
    region: {
      latitude: number;
      longitude: number;
    };
  };
}

export interface ShippingAddress extends BaseAddress {
  // User full-name
  name: string;
  // Phone number (e.g. 84909******)
  phone: string;
}

export interface UserAddress extends WithMongoGeo<ShippingAddress> {
  // Address ID
  id: string;
  // User ID
  user_id: string;
  // Is default address?
  is_delivery_address: boolean;
  // Date and time address was created
  created_at: Date;
  // Date and time address was created
  updated_at: Date;
}

export type UserAddressOutput = WithoutMongoGeo<UserAddress>;

export type CreateUpdateUserAddressInput = Omit<UserAddress, 'id' | 'mongodb_geo' | 'created_at' | 'updated_at'>;

export type UserAddressPublicResponse = Pick<UserAddress, 'id' | 'country' | 'province' | 'district' | 'ward'>;
