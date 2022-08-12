import { Db } from 'mongodb';
import { Inject, Service } from 'typedi';
import { DIMongoDB } from '@/loaders/mongoDBLoader';
import { DILogger } from '@/loaders/loggerLoader';
import Logger from '@/core/logger';
import { Product } from './product.type';

export const COLLECTION_NAME = 'products';

@Service()
export class ProductModel {
  private readonly _collection;

  constructor(@Inject(DILogger) private logger: Logger, @Inject(DIMongoDB) private db: Db) {
    this._collection = db.collection<Product>(COLLECTION_NAME);
    Promise.all([
      // Unique ID

      this._collection.createIndex('name', { unique: false }),
    ]).catch((err) => {
      this.logger.error(err);
    });
  }

  get collection() {
    return this._collection;
  }
}
