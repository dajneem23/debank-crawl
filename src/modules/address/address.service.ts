import { Inject, Service } from 'typedi';
import { Filter } from 'mongodb';
import { pick } from 'lodash';
import Logger from '@/core/logger';
import { throwErr } from '@/utils/common';
import { alphabetSize12 } from '@/utils/randomString';
import { SystemError } from '@/core/errors/CommonError';

import AddressModel from './address.model';
import { buildMongodbGeospatial, toUserAddressOutput } from './address.util';
import { UserAddress, CreateUpdateUserAddressInput } from '@/modules/address/address.type';
import { AddressError } from '@/modules/address/address.error';
import { BaseQuery, PaginationResult } from '@/types/Common';
import { withMongoTransaction } from '@/utils/mongoDB';

@Service()
export default class AddressService {
  private logger = new Logger('AddressService');

  @Inject()
  private addressModel: AddressModel;

  /**
   * A bridge allows another service access to the Model layer
   */
  get collection() {
    return this.addressModel.collection;
  }

  /**
   * Query addresses
   */
  async query(filter: Partial<UserAddress>, query: BaseQuery): Promise<PaginationResult<UserAddress>> {
    try {
      const [
        {
          total_count: [{ count } = { count: 0 }],
          items,
        },
      ] = (await this.addressModel.collection
        .aggregate([
          { $match: filter },
          { $sort: { [query.sort_by]: query.sort_order === 'asc' ? 1 : -1 } },
          {
            $facet: {
              total_count: [{ $count: 'count' }],
              items: [{ $skip: query.per_page * (query.page - 1) }, { $limit: query.per_page }],
            },
          },
        ])
        .toArray()) as any;
      this.logger.debug('[query:success]', { count });
      return {
        total_count: count,
        items: items.map((item: UserAddress) => toUserAddressOutput(item)),
      };
    } catch (err) {
      this.logger.error('[query:error]', err.message);
      throw err;
    }
  }

  /**
   * Get an address
   */
  async getOne(filter: Filter<UserAddress>) {
    try {
      const address = await this.addressModel.collection.findOne(filter);
      if (!address) throwErr(new AddressError('ADDRESS_NOT_FOUND'));
      this.logger.debug('[getOne:success]', { filter });
      return toUserAddressOutput(address);
    } catch (err) {
      this.logger.error('[getOne:error]', err.message);
      throw err;
    }
  }

  /**
   * Create new address
   */
  async create(payload: CreateUpdateUserAddressInput) {
    try {
      // Count of user's addresses
      const countAddresses = await this.countUserAddresses(payload.user_id);
      // Create address
      const now = new Date();
      const address: UserAddress = {
        id: await alphabetSize12(),
        ...payload,
        is_delivery_address: countAddresses === 0 || payload.is_delivery_address,
        mongodb_geo: buildMongodbGeospatial(payload.geoinfo),
        created_at: now,
        updated_at: now,
      };
      const { acknowledged } = await this.addressModel.collection.insertOne(address);
      if (!acknowledged) {
        throwErr(new SystemError(`MongoDB insertOne() failed! Payload: ${JSON.stringify(payload)}`));
      }
      // Handle default address
      if (address.is_delivery_address) {
        await this.setAsDefault({ id: address.id, user_id: address.user_id });
      }
      this.logger.debug('[create:success]', pick(address, 'user_id'));
      return toUserAddressOutput(address);
    } catch (err) {
      this.logger.error('[create:error]', err.message);
      throw err;
    }
  }

  /**
   * Update address
   */
  async update(filter: Filter<UserAddress>, payload: CreateUpdateUserAddressInput) {
    try {
      // Update address
      const { value: address } = await this.addressModel.collection.findOneAndUpdate(
        filter,
        {
          $set: {
            ...payload,
            mongodb_geo: buildMongodbGeospatial(payload.geoinfo),
            updated_at: new Date(),
          },
        },
        { returnDocument: 'after' },
      );
      if (!address) throwErr(new AddressError('ADDRESS_NOT_FOUND'));
      // Handle default address
      if (payload.is_delivery_address) {
        await this.setAsDefault({ id: address.id, user_id: address.user_id });
      }
      this.logger.debug('[update:success]', pick(address, 'user_id'));
      return toUserAddressOutput(address);
    } catch (err) {
      this.logger.error('[update:error]', err.message);
      throw err;
    }
  }

  /**
   * Delete address
   */
  async delete(filter: Filter<UserAddress>) {
    try {
      const { value: address } = await this.addressModel.collection.findOneAndDelete(filter);
      if (!address) throwErr(new AddressError('ADDRESS_NOT_FOUND'));
      // Find and set default address
      if (address.is_delivery_address) {
        const latestAddress = await this.addressModel.collection.findOne(
          { user_id: address.user_id },
          { sort: { updated_at: -1 } },
        );
        if (latestAddress) {
          await this.setAsDefault({
            id: latestAddress.id,
            user_id: latestAddress.user_id,
          });
        }
      }
      this.logger.debug('[delete:success]', pick(address, 'id', 'user_id'));
      return toUserAddressOutput(address);
    } catch (err) {
      this.logger.error('[delete:error]', err.message);
      throw err;
    }
  }

  /**
   * Get the number of user's addresses
   */
  async countUserAddresses(userId: string) {
    try {
      const count = await this.addressModel.collection.countDocuments({
        user_id: userId,
      });
      this.logger.debug('[countUserAddresses:success]', { count });
      return count;
    } catch (err) {
      this.logger.error('[countUserAddresses:error]', err.message);
      throw err;
    }
  }

  /**
   * Set an address as default
   */
  async setAsDefault(filter: Pick<UserAddress, 'id' | 'user_id'>) {
    try {
      let defaultAddress: UserAddress;
      await withMongoTransaction(async (session) => {
        // Set as default address
        const { value: address } = await this.addressModel.collection.findOneAndUpdate(
          { id: filter.id, user_id: filter.user_id },
          { $set: { is_delivery_address: true, updated_at: new Date() } },
          { session, returnDocument: 'after' },
        );
        if (!address) throwErr(new AddressError('ADDRESS_NOT_FOUND'));
        defaultAddress = address;
        // Unset the current default
        await this.addressModel.collection.updateMany(
          { id: { $ne: filter.id }, user_id: filter.user_id, is_delivery_address: true },
          { $set: { is_delivery_address: false, updated_at: new Date() } },
          { session },
        );
      });
      this.logger.debug('[setAsDefault:success]', { id: filter.id });
      return toUserAddressOutput(defaultAddress);
    } catch (err) {
      this.logger.error('[setAsDefault:error]', err.message);
      throw err;
    }
  }
}
