import { Db } from 'mongodb';
import { Inject, Service } from 'typedi';
import { DIMongoDB } from '@/loaders/mongoDBLoader';
import { DILogger } from '@/loaders/loggerLoader';
import Logger from '@/core/logger';
import { Person } from './person.type';

export const COLLECTION_NAME = 'persons';

@Service()
export class PersonModel {
  private readonly _collection;

  constructor(@Inject(DILogger) private logger: Logger, @Inject(DIMongoDB) private db: Db) {
    this._collection = db.collection<Person>(COLLECTION_NAME);
    Promise.all([
      // Unique ID
      this._collection.createIndex('id', { unique: true }),
      // Unique name
      this._collection.createIndex('name', { unique: true }),
    ]).catch((err) => {
      this.logger.error(err);
    });
  }

  get collection() {
    return this._collection;
  }
}
