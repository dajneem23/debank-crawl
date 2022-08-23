import { Db } from 'mongodb';
import { Inject, Service } from 'typedi';
import { DIMongoDB } from '@/loaders/mongoDBLoader';
import { DILogger } from '@/loaders/loggerLoader';
import { Category } from '.';
import Logger from '@/core/logger';

const COLLECTION_NAME = 'categories';

@Service()
export class CategoryModel {
  private readonly _collection;

  constructor(@Inject(DILogger) private logger: Logger, @Inject(DIMongoDB) private db: Db) {
    this._collection = db.collection<Category>(COLLECTION_NAME);
    Promise.all([
      this._collection.createIndex('title', { unique: false }),
      this._collection.createIndex('name', { unique: false }),
    ]).catch((err) => {
      this.logger.error(err);
    });
  }

  get collection() {
    return this._collection;
  }
}
