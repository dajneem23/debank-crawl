import {
  Collection,
  Db,
  IndexDirection,
  CreateIndexesOptions,
  FindOneAndUpdateOptions,
  AggregateOptions,
  AggregationCursor,
  WithId,
} from 'mongodb';
import Container, { Inject, Service } from 'typedi';
import { DIMongoDB } from '@/loaders/mongoDBLoader';
import { DILogger } from '@/loaders/loggerLoader';
import Logger from '@/core/logger';
import { CommonError, errors } from '@/core/errors/CommonError';
import { throwErr } from '@/utils/common';
import { $toMongoFilter, $toObjectId } from '@/utils/mongoDB';
import { $refValidation } from '@/utils/validation';
import { COLLECTION_NAMES, T } from '@/types';

/**
 * @class BaseModel
 * @description Base model for all models
 */
export class BaseModel {
  readonly _collection: Collection;

  readonly _collectionName: COLLECTION_NAMES;

  readonly _keys: (string | number | symbol)[];

  readonly _defaultFilter = {
    deleted: false,
  };
  // Get Db instance from DI
  private db: Db = Container.get(DIMongoDB) as Db;
  // Get logger Instance from DI
  private logger: Logger = Container.get(DILogger) as Logger;
  //init error
  private error(msg: keyof typeof errors): CommonError {
    return new CommonError(msg);
  }

  constructor({
    collectionName,
    _keys,
    indexes,
  }: {
    collectionName: COLLECTION_NAMES;
    _keys: string[];
    indexes: {
      field: {
        [key: string]: IndexDirection;
      };
      options?: CreateIndexesOptions;
    }[];
  }) {
    this._keys = _keys;
    this._collectionName = collectionName;
    this._collection = this.db.collection<any>(collectionName);
    Promise.allSettled(
      indexes.map(
        ({
          field,
          options = {},
        }: {
          field: {
            [key: string]: IndexDirection;
          };
          options?: CreateIndexesOptions;
        }) => {
          return this._collection.createIndex(field, options);
        },
      ),
    ).then((results) => {
      results.forEach((result) => {
        if (result.status === 'rejected') {
          this.logger.error(`error`, `[createIndex:${this._collectionName}:error]`, result.reason);
          throwErr(this.error('common.database'));
        } else {
          this.logger.debug('success', `[createIndex:${this._collectionName}:success]`, result.value);
        }
      });
    });
  }

  /**
   * Create document
   * @param {any} Filter - filter
   * @param {any} Body - body
   * @param {FindOneAndUpdateOptions} Options - options
   * @returns {Promise<WithId<T> | null> }- WithId<T> | null
   */
  async create(
    { ...filter }: any,
    { updated_at = new Date(), created_at = new Date(), deleted = false, created_by, ..._content }: any,
    { upsert = true, returnDocument = 'after', ...options }: FindOneAndUpdateOptions = {},
  ): Promise<WithId<T> | null> {
    try {
      const {
        categories = [],
        event_tags = [],
        product_tags = [],
        company_tags = [],
        person_tags = [],
        coin_tags = [],
      } = _content;
      categories.length &&
        (await $refValidation({ collection: 'categories', list: $toObjectId(categories) })) &&
        (_content.categories = $toObjectId(categories));
      event_tags.length &&
        (await $refValidation({ collection: 'events', list: $toObjectId(event_tags) })) &&
        (_content.event_tags = $toObjectId(event_tags));
      product_tags.length &&
        (await $refValidation({ collection: 'products', list: $toObjectId(product_tags) })) &&
        (_content.product_tags = $toObjectId(product_tags));
      company_tags.length &&
        (await $refValidation({ collection: 'companies', list: $toObjectId(company_tags) })) &&
        (_content.company_tags = $toObjectId(company_tags));
      person_tags.length &&
        (await $refValidation({ collection: 'persons', list: $toObjectId(person_tags) })) &&
        (_content.person_tags = $toObjectId(person_tags));
      coin_tags.length &&
        (await $refValidation({ collection: 'coins', list: $toObjectId(coin_tags) })) &&
        (_content.coin_tags = $toObjectId(coin_tags));

      const {
        value,
        ok,
        lastErrorObject: { updatedExisting },
      } = await this._collection.findOneAndUpdate(
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
      this.logger.debug('create_success', `[create:${this._collectionName}:success]`, { _content });
      return value;
    } catch (err) {
      this.logger.error('create_error', `[create:${this._collectionName}:error]`, err.message);
      throw err;
    }
  }
  /**
   * Update document
   * @param {any} - filter
   * @param {any} - body
   * @param {FindOneAndUpdateOptions} - options
   * @returns {Promise<WithId<T> | null>} - WithId<T> | null
   */
  async update(
    { ...filter }: any,
    { updated_at = new Date(), updated_by, ..._content }: any,
    { upsert = false, returnDocument = 'after', ...options }: FindOneAndUpdateOptions = {},
  ): Promise<WithId<T> | null> {
    try {
      const {
        categories = [],
        event_tags = [],
        product_tags = [],
        company_tags = [],
        person_tags = [],
        coin_tags = [],
      } = _content;
      categories.length &&
        (await $refValidation({ collection: 'categories', list: $toObjectId(categories) })) &&
        (_content.categories = $toObjectId(categories));
      event_tags.length &&
        (await $refValidation({ collection: 'events', list: $toObjectId(event_tags) })) &&
        (_content.event_tags = $toObjectId(event_tags));
      product_tags.length &&
        (await $refValidation({ collection: 'products', list: $toObjectId(product_tags) })) &&
        (_content.product_tags = $toObjectId(product_tags));
      company_tags.length &&
        (await $refValidation({ collection: 'companies', list: $toObjectId(company_tags) })) &&
        (_content.company_tags = $toObjectId(company_tags));
      person_tags.length &&
        (await $refValidation({ collection: 'persons', list: $toObjectId(person_tags) })) &&
        (_content.person_tags = $toObjectId(person_tags));
      coin_tags.length &&
        (await $refValidation({ collection: 'coins', list: $toObjectId(coin_tags) })) &&
        (_content.coin_tags = $toObjectId(coin_tags));
      const {
        value,
        ok,
        lastErrorObject: { updatedExisting },
      } = await this._collection.findOneAndUpdate(
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
      this.logger.debug('update_success', `[update:${this._collectionName}:success]`, { _content });
      return value;
    } catch (err) {
      this.logger.error(`update_error`, `[update:${this._collectionName}:error]`, err.message);
      throw err;
    }
  }

  /**
   * Delete document
   * @param _id
   * @param {ObjectId} deleted_by - user id
   * @returns {Promise<void>} - void
   */
  async delete(
    { ...filter },
    { deleted_at = new Date(), deleted_by, deleted = true }: any,
    { upsert = false, returnDocument = 'after', ...options }: FindOneAndUpdateOptions = {},
  ): Promise<void> {
    try {
      const {
        value,
        ok,
        lastErrorObject: { updatedExisting },
      } = await this._collection.findOneAndUpdate(
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
      this.logger.debug('delete_success', `[delete:${this._collectionName}:success]`, { _id: value?._id });
      return;
    } catch (err) {
      this.logger.error('delete_error', `[delete:${this._collectionName}:error]`, err.message);
      throw err;
    }
  }
  /**
   *  Get document
   *  @param {any[]} pipeline - pipeline
   *  @param {AggregateOptions} options
   *  @return {Promise<AggregationCursor<T>>} - AggregationCursor
   */
  get(pipeline: any[] = [], options: AggregateOptions = {}): AggregationCursor<T> {
    try {
      return this._collection.aggregate(pipeline, options);
    } catch (err) {
      this.logger.error('get_error', `[get:${this._collectionName}:error]`, err.message);
      throw err;
    }
  }
}
