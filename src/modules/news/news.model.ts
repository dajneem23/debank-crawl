import { Db } from 'mongodb';
import { Inject, Service } from 'typedi';
import { DIMongoDB } from '@/loaders/mongoDBLoader';
import { DILogger } from '@/loaders/loggerLoader';
import Logger from '@/core/logger';
import { News } from './news.type';

const COLLECTION_NAME = 'news';

@Service()
export class NewsModel {
  private readonly _collection;

  constructor(@Inject(DILogger) private logger: Logger, @Inject(DIMongoDB) private db: Db) {
    this._collection = db.collection<News>(COLLECTION_NAME);
    Promise.all([
      // Unique ID
      this._collection.createIndex({ 'contents.title': 'text' }, { unique: false }),
      this._collection.createIndex({ 'contents.title': 1 }, { unique: false }),
      // this._collection.createIndex({ 'contents.slug': 'text' }, { unique: true }),
      this._collection.createIndex({ 'contents.slug': 1 }, { unique: true }),
      this._collection.createIndex('contents.lang', { unique: false }),
      this._collection.createIndex('contents.headings', { unique: false }),
    ]).catch((err) => {
      this.logger.error(err);
    });
  }

  get collection() {
    return this._collection;
  }
}
