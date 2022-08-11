import { Db } from 'mongodb';
import { Inject, Service } from 'typedi';
import { DIMongoDB } from '@/loaders/mongoDBLoader';
import { DILogger } from '@/loaders/loggerLoader';
import { Country } from '.';
import Logger from '@/core/logger';

export const COLLECTION_NAME = 'countries';

@Service()
export class CountryModel {
  private readonly _collection;

  constructor(@Inject(DILogger) private logger: Logger, @Inject(DIMongoDB) private db: Db) {
    this._collection = db.collection<Country>(COLLECTION_NAME);
    Promise.all([
      // Unique ID

      // Unique code
      this._collection.createIndex('code', { unique: true }),
    ]).catch((err) => {
      this.logger.error(err);
    });
  }

  get collection() {
    return this._collection;
  }
}
