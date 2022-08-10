import { MongoClient } from 'mongodb';
import { Inject, Service } from 'typedi';
import { DIMongoClient } from '@/loaders/mongoDBLoader';
import { DILogger } from '@/loaders/loggerLoader';
import Logger from '@/core/logger';
import { UserAddress } from './address.type';

export const COLLECTION_NAME = 'addresses';

@Service()
export default class AddressModel {
  private readonly _collection;

  constructor(@Inject(DILogger) private logger: Logger, @Inject(DIMongoClient) private client: MongoClient) {
    this._collection = client.db().collection<UserAddress>(COLLECTION_NAME);
    Promise.all([
      // Unique ID
      this._collection.createIndex('id', { unique: true }),
      // Geospatial Indexes
      this._collection.createIndex({ mongodb_geo: '2dsphere' }),
    ]).catch((err) => {
      this.logger.error(err);
    });
  }

  get collection() {
    return this._collection;
  }

  get mongoClient() {
    return this.client;
  }
}
