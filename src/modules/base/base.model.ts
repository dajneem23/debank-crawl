import { Collection, Db, IndexDirection, CreateIndexesOptions, FindOneAndUpdateOptions } from 'mongodb';
import Container, { Inject, Service } from 'typedi';
import { DIMongoDB } from '@/loaders/mongoDBLoader';
import { DILogger } from '@/loaders/loggerLoader';
import Logger from '@/core/logger';
import { CommonError } from '@/core/errors/CommonError';
import { throwErr } from '@/utils/common';
import { $toMongoFilter, $toObjectId } from '@/utils/mongoDB';
import { categoriesValidation } from '@/utils/validation';

@Service()
export class BaseModel {
  readonly _collection: Collection;

  readonly _collectionName: string;

  readonly _defaultFilter = {
    deleted: false,
  };

  private db = Container.get(DIMongoDB) as Db;

  private logger = Container.get(DILogger) as Logger;

  private error(msg: any) {
    return new CommonError(msg);
  }

  constructor({
    collectionName,
    indexes,
  }: {
    collectionName: string;
    indexes: {
      field: {
        [key: string]: IndexDirection;
      };
      options?: CreateIndexesOptions;
    }[];
  }) {
    this._collectionName = collectionName;
    this._collection = this.db.collection<any>(collectionName);
    Promise.allSettled(
      indexes.map(
        ({
          field,
          options,
        }: {
          field: {
            [key: string]: IndexDirection;
          };
          options?: CreateIndexesOptions;
        }) => {
          return this._collection.createIndex(field, options);
        },
      ),
    ).catch((err) => {
      this.logger.error(err);
    });
  }

  get collection() {
    return this._collection;
  }
  /**
   *
   * @param Filter - filter
   * @param Body - body
   * @returns
   */
  async create(
    { ...filter }: any,
    { updated_at = new Date(), created_at = new Date(), deleted = false, created_by, ..._content }: any,
    { upsert = true, returnDocument = 'after', ...options }: FindOneAndUpdateOptions = {},
  ) {
    try {
      const { categories = [] } = _content;
      categories.length && (await categoriesValidation($toObjectId(categories)));
      const {
        value,
        ok,
        lastErrorObject: { updatedExisting },
      } = await this.collection.findOneAndUpdate(
        { ...filter },
        {
          $setOnInsert: {
            ..._content,
            created_by,
            created_at,
            updated_at,
            deleted,
          },
        },
        {
          upsert,
          returnDocument,
          ...options,
        },
      );
      if (!ok) {
        throwErr(this.error('common.database'));
      }
      if (updatedExisting) {
        throwErr(this.error('common.already_exist'));
      }
      this.logger.debug(`[create:${this._collectionName}:success]`, { _content });
      return value;
    } catch (err) {
      this.logger.error(`[create:${this._collectionName}:error]`, err.message);
      throw err;
    }
  }
  async update(
    { ...filter }: any,
    { updated_at = new Date(), updated_by, ..._content }: any,
    { upsert = false, returnDocument = 'after', ...options }: FindOneAndUpdateOptions = {},
  ) {
    try {
      const { categories = [] } = _content;
      categories.length && (await categoriesValidation($toObjectId(categories)));
      const {
        value,
        ok,
        lastErrorObject: { updatedExisting },
      } = await this.collection.findOneAndUpdate(
        $toMongoFilter(filter),
        {
          $set: {
            ..._content,
            updated_at,
            updated_by,
          },
        },
        {
          upsert,
          returnDocument,
          ...options,
        },
      );
      if (!ok) {
        throwErr(this.error('common.database'));
      }
      if (!updatedExisting) {
        throwErr(this.error('common.not_found'));
      }
      this.logger.debug(`[update:${this._collectionName}:success]`, { _content });
      return value;
    } catch (err) {
      this.logger.error(`[update:${this._collectionName}:error]`, err.message);
      throw err;
    }
  }

  /**
   * Delete category
   * @param _id
   * @param {ObjectId} deleted_by - user id
   * @returns {Promise<void>}
   */
  async delete(
    { ...filter },
    { deleted_at = new Date(), deleted_by, deleted = true }: any,
    { upsert = false, returnDocument = 'after', ...options }: FindOneAndUpdateOptions = {},
  ) {
    try {
      const {
        value,
        ok,
        lastErrorObject: { updatedExisting },
      } = await this.collection.findOneAndUpdate(
        $toMongoFilter(filter),
        {
          $set: {
            deleted,
            deleted_by,
            deleted_at,
          },
        },
        {
          upsert,
          returnDocument,
          ...options,
        },
      );
      if (!ok) {
        throwErr(this.error('common.database'));
      }
      if (!updatedExisting) {
        throwErr(this.error('common.not_found'));
      }
      this.logger.debug(`[delete:${this._collectionName}:success]`, { _id: value?._id });
      return;
    } catch (err) {
      this.logger.error(`[delete:${this._collectionName}:error]`, err.message);
      throw err;
    }
  }
}
