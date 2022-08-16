import { Inject, Service } from 'typedi';
import Logger from '@/core/logger';
import { getDateTime, throwErr, toOutPut, toPagingOutput } from '@/utils/common';
import { alphabetSize12 } from '@/utils/randomString';
import { $lookup, $toObjectId, $pagination, $toMongoFilter, $checkListIdExist } from '@/utils/mongoDB';
import { PersonError, PersonModel } from '.';
import { BaseServiceInput, BaseServiceOutput } from '@/types/Common';
import { isNil, omit } from 'lodash';

@Service()
export class PersonService {
  private logger = new Logger('PersonService');

  @Inject()
  private model: PersonModel;

  private error(msg: any) {
    return new PersonError(msg);
  }

  /**
   * A bridge allows another service access to the Model layer
   */
  get collection() {
    return this.model.collection;
  }

  get outputKeys() {
    return ['id', 'name', 'categories', 'position', 'works', 'educations', 'author'];
  }
  /**
   *  Lookups
   */
  get lookups(): any {
    return {
      categories: $lookup({
        from: 'categories',
        refFrom: '_id',
        refTo: 'categories',
        select: 'title type',
        reName: 'categories',
        operation: '$in',
      }),
      user: $lookup({
        from: 'users',
        refFrom: 'id',
        refTo: 'created_by',
        select: 'full_name avatar',
        reName: 'author',
        operation: '$eq',
      }),
      teams: $lookup({
        from: 'teams',
        refFrom: '_id',
        refTo: 'teams',
        select: 'name avatar',
        reName: 'teams',
        operation: '$in',
      }),
      directors: $lookup({
        from: 'persons',
        refFrom: '_id',
        refTo: 'director',
        select: 'name avatar',
        reName: 'director',
        operation: '$eq',
      }),
      countries: $lookup({
        from: 'countries',
        refFrom: '_id',
        refTo: 'country',
        select: 'name',
        reName: 'country',
        operation: '$eq',
      }),
    };
  }

  /**
   * Generate ID
   */
  static async generateID() {
    return alphabetSize12();
  }
  /**
   * Create a new category
   * @param _content
   * @param _subject
   * @returns {Promise<BaseServiceOutput>}
   */
  async create({ _content, _subject }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const now = new Date();
      const { name } = _content;
      const { categories } = _content;

      const categoriesIdExist =
        !!categories && categories.length > 0
          ? await $checkListIdExist({ collection: 'categories', listId: categories })
          : true;

      if (!categoriesIdExist) {
        throwErr(this.error('INPUT_INVALID'));
      }
      const {
        value,
        ok,
        lastErrorObject: { updatedExisting },
      } = await this.model.collection.findOneAndUpdate(
        {
          name,
        },
        {
          $setOnInsert: {
            ..._content,
            categories: categories ? $toObjectId(categories) : [],
            deleted: false,
            ...(_subject && { created_by: _subject }),
            created_at: now,
            updated_at: now,
          },
        },
        {
          upsert: true,
          returnDocument: 'after',
        },
      );
      if (!ok) {
        throwErr(this.error('DATABASE_ERROR'));
      }
      if (updatedExisting) {
        throwErr(this.error('ALREADY_EXIST'));
      }
      this.logger.debug('[create:success]', { _content });
      return toOutPut({ item: value, keys: this.outputKeys });
    } catch (err) {
      this.logger.error('[create:error]', err.message);
      throw err;
    }
  }

  /**
   * Update category
   * @param _id
   * @param _content
   * @param _subject
   * @returns {Promise<Person>}
   */
  async update({ _id, _content, _subject }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const now = new Date();

      const { categories } = _content;
      const categoriesIdExist =
        !!categories && categories.length > 0
          ? await $checkListIdExist({ collection: 'categories', listId: categories })
          : true;

      if (!categoriesIdExist) {
        throwErr(this.error('INPUT_INVALID'));
      }
      const {
        ok,
        lastErrorObject: { updatedExisting },
      } = await this.model.collection.findOneAndUpdate(
        $toMongoFilter({ _id }),
        {
          $set: {
            ..._content,
            ...(categories && { categories: $toObjectId(categories) }),
            ...(_subject && { created_by: _subject }),
            updated_at: now,
          },
        },
        {
          upsert: false,
          returnDocument: 'after',
        },
      );
      if (!ok) {
        throwErr(this.error('DATABASE_ERROR'));
      }
      if (!updatedExisting) {
        throwErr(this.error('NOT_FOUND'));
      }
      this.logger.debug('[update:success]', { _content });
      return toOutPut({ item: _content, keys: this.outputKeys });
    } catch (err) {
      this.logger.error('[update:error]', err.message);
      throw err;
    }
  }

  /**
   * Delete category
   * @param _id
   * @param {ObjectId} _subject
   * @returns {Promise<void>}
   */
  async delete({ _id, _subject }: BaseServiceInput): Promise<void> {
    try {
      const now = new Date();
      const {
        ok,
        lastErrorObject: { updatedExisting },
      } = await this.model.collection.findOneAndUpdate(
        $toMongoFilter({ _id }),
        {
          $set: {
            deleted: true,
            ...(_subject && { deleted_by: _subject }),
            deleted_at: now,
          },
        },
        {
          upsert: false,
          returnDocument: 'after',
        },
      );
      if (!ok) {
        throwErr(this.error('DATABASE_ERROR'));
      }
      if (!updatedExisting) {
        throwErr(this.error('NOT_FOUND'));
      }
      this.logger.debug('[delete:success]', { _id });
      return;
    } catch (err) {
      this.logger.error('[delete:error]', err.message);
      throw err;
    }
  }

  /**
   *  Query category
   * @param {any} _filter
   * @param {BaseQuery} _query
   * @returns {Promise<BaseServiceOutput>}
   *
   **/
  async query({ _filter, _query }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { q } = _filter;
      const { page = 1, per_page, sort_by, sort_order } = _query;
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model.collection
        .aggregate(
          $pagination({
            $match: {
              ...(q && {
                name: { $regex: q, $options: 'i' },
              }),
            },
            ...(sort_by && sort_order && { $sort: { [sort_by]: sort_order == 'asc' ? 1 : -1 } }),
            ...(per_page && page && { items: [{ $skip: +per_page * (+page - 1) }, { $limit: +per_page }] }),
          }),
        )
        .toArray();
      this.logger.debug('[query:success]', { total_count, items });
      return toPagingOutput({ items, total_count, keys: this.outputKeys });
    } catch (err) {
      this.logger.error('[query:error]', err.message);
      throw err;
    }
  }
  /**
   * Get event by ID
   * @param id - Event ID
   * @returns { Promise<BaseServiceOutput> } - Event
   */
  async getById({ _id }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const [item] = await this.model.collection
        .aggregate([
          { $match: $toMongoFilter({ _id }) },
          this.lookups.categories,
          this.lookups.user,
          {
            $limit: 1,
          },
          {
            $set: {
              author: { $first: '$author' },
            },
          },
        ])
        .toArray();
      if (isNil(item)) throwErr(this.error('NOT_FOUND'));
      this.logger.debug('[get:success]', { item });
      return omit(toOutPut({ item }), ['deleted', 'updated_at']);
    } catch (err) {
      this.logger.error('[get:error]', err.message);
      throw err;
    }
  }
}
