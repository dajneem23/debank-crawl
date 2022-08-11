import { Db } from 'mongodb';
import { Inject, Service } from 'typedi';
import { DIMongoDB } from '@/loaders/mongoDBLoader';
import { DILogger } from '@/loaders/loggerLoader';
import { Category } from '.';
import Logger from '@/core/logger';

export const COLLECTION_NAME = 'categories';

@Service()
export default class CategoryModel {
  private readonly _collection;

  constructor(@Inject(DILogger) private logger: Logger, @Inject(DIMongoDB) private db: Db) {
    this._collection = db.collection<Category>(COLLECTION_NAME);
    Promise.all([
      // Unique ID

      // Unique title
      this._collection.createIndex('title', { unique: true }),
    ]).catch((err) => {
      this.logger.error(err);
    });
  }

  get collection() {
    return this._collection;
  }
}
