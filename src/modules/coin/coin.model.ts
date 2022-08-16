import { Db } from 'mongodb';
import { Inject, Service } from 'typedi';
import { DIMongoDB } from '@/loaders/mongoDBLoader';
import { DILogger } from '@/loaders/loggerLoader';
import Logger from '@/core/logger';
import { Coin } from './coin.type';

const COLLECTION_NAME = 'teams';

@Service()
export class CoinModel {
  private readonly _collection;

  constructor(@Inject(DILogger) private logger: Logger, @Inject(DIMongoDB) private db: Db) {
    this._collection = db.collection<Coin>(COLLECTION_NAME);
    Promise.all([
      // Unique ID

      this._collection.createIndex('name', { unique: false }),

      this._collection.createIndex('token_id', { unique: false }),

      this._collection.createIndex('unique_key', { unique: false }),
    ]).catch((err) => {
      this.logger.error(err);
    });
  }

  get collection() {
    return this._collection;
  }
}
