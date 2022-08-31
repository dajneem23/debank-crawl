import { Inject, Service } from 'typedi';
import Logger from '@/core/logger';
import { getDateTime, throwErr, toOutPut, toPagingOutput } from '@/utils/common';
import { alphabetSize12 } from '@/utils/randomString';
import { $lookup, $toObjectId, $pagination, $toMongoFilter, $queryByList, $keysToProject } from '@/utils/mongoDB';
import { CoinError, CoinModel } from '.';
import { BaseServiceInput, BaseServiceOutput, PRIVATE_KEYS } from '@/types/Common';
import { isNil, omit, rest } from 'lodash';
import { _coin } from '@/modules';

@Service()
export class CoinService {
  private logger = new Logger('CoinService');

  @Inject()
  private model: CoinModel;

  private error(msg: any) {
    return new CoinError(msg);
  }

  /**
   * A bridge allows another service access to the Model layer
   */
  get collection() {
    return this.model.collection;
  }

  get outputKeys() {
    return ['id', ...Object.keys(_coin), 'author'];
  }
  get publicOutputKeys() {
    return ['id', 'name', 'token_id', 'about', 'categories', 'avatar'];
  }
  get transKeys() {
    return ['about', 'features', 'services'];
  }
  /**
   *  Lookups
   */
  get $lookups(): any {
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
        select: 'full_name picture',
        reName: 'author',
        operation: '$eq',
      }),
    };
  }
  get $sets() {
    return {
      country: {
        $set: {
          country: { $first: '$country' },
        },
      },
      author: {
        $set: {
          author: { $first: '$author' },
        },
      },
      trans: {
        $set: {
          trans: { $first: '$trans' },
        },
      },
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
      const validCategories =
        !!categories && categories.length > 0
          ? await $queryByList({ collection: 'categories', values: categories })
          : true;

      if (!validCategories) {
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
   * @returns {Promise<Coin>}
   */
  async update({ _id, _content, _subject }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const now = new Date();

      const { categories } = _content;
      const validCategories =
        !!categories && categories.length > 0
          ? await $queryByList({ collection: 'categories', values: categories })
          : true;
      if (!validCategories) {
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
            ...(_subject && { updated_by: _subject }),
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
  async query({ _filter, _query, _permission = 'public' }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { lang, q, category } = _filter;
      const { page = 1, per_page, sort_by, sort_order } = _query;
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model.collection
        .aggregate(
          $pagination({
            $match: {
              $and: [
                {
                  deleted: false,
                  ...(lang && {
                    'trans.lang': { $eq: lang },
                  }),
                },
              ],
              ...(q && {
                $or: [
                  { name: { $regex: q, $options: 'i' } },
                  { token_id: { $regex: q, $options: 'i' } },
                  { unique_key: { $regex: q, $options: 'i' } },
                ],
              }),
              ...(category && {
                $or: [
                  { categories: { $in: Array.isArray(category) ? $toObjectId(category) : $toObjectId([category]) } },
                ],
              }),
            },
            $lookups: [this.$lookups.categories],
            $projects: [
              {
                $project: {
                  ...$keysToProject(this.outputKeys),
                  trans: {
                    $filter: {
                      input: '$trans',
                      as: 'trans',
                      cond: {
                        $eq: ['$$trans.lang', lang],
                      },
                    },
                  },
                },
              },
            ],
            $more: [
              this.$sets.trans,
              {
                $project: {
                  ...$keysToProject(this.outputKeys),
                  ...(lang && $keysToProject(this.transKeys, '$trans')),
                },
              },
            ],
            ...(sort_by && sort_order && { $sort: { [sort_by]: sort_order == 'asc' ? 1 : -1 } }),
            ...(per_page && page && { items: [{ $skip: +per_page * (+page - 1) }, { $limit: +per_page }] }),
          }),
        )
        .toArray();
      this.logger.debug('[query:success]', { total_count, items });
      return toPagingOutput({
        items,
        total_count,
        keys: _permission == 'private' ? this.outputKeys : this.publicOutputKeys,
      });
    } catch (err) {
      this.logger.error('[query:error]', err.message);
      throw err;
    }
  }
  /**
   * Get event by ID
   * @param _id - Event ID
   * @param _filter - Filter
   * @returns { Promise<BaseServiceOutput> } - Event
   */
  async getById({ _id, _filter, _permission = 'public' }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { lang } = _filter;
      const [item] = await this.model.collection
        .aggregate([
          {
            $match: {
              ...$toMongoFilter({
                _id,
              }),
              ...(lang && {
                'trans.lang': { $eq: lang },
              }),
            },
          },
          this.$lookups.categories,
          this.$lookups.user,
          this.$sets.author,
          {
            $project: {
              ...$keysToProject(this.outputKeys),
              trans: {
                $filter: {
                  input: '$trans',
                  as: 'trans',
                  cond: {
                    $eq: ['$$trans.lang', lang],
                  },
                },
              },
            },
          },
          this.$sets.trans,
          {
            $project: {
              ...$keysToProject(this.outputKeys),
              ...(lang && $keysToProject(this.transKeys, '$trans')),
            },
          },
          {
            $limit: 1,
          },
        ])
        .toArray();
      if (isNil(item)) throwErr(this.error('NOT_FOUND'));
      this.logger.debug('[get:success]', { item });
      return _permission == 'private' ? toOutPut({ item }) : omit(toOutPut({ item }), PRIVATE_KEYS);
    } catch (err) {
      this.logger.error('[get:error]', err.message);
      throw err;
    }
  }
  /**
   * Search by text index
   * @param {BaseServiceInput} _filter _query
   * @returns
   */
  async search({ _filter, _query }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { q, lang } = _filter;
      const { page = 1, per_page = 10, sort_by, sort_order } = _query;
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model.collection
        .aggregate([
          ...$pagination({
            $match: {
              $and: [
                {
                  deleted: false,
                  ...(lang && {
                    'trans.lang': { $eq: lang },
                  }),
                },
              ],
              ...(q && {
                $or: [{ $text: { $search: q } }, { name: { $regex: q, $options: 'i' } }],
              }),
            },
            $lookups: [this.$lookups.categories],
            $projects: [
              {
                $project: {
                  ...$keysToProject(this.outputKeys),
                  trans: {
                    $filter: {
                      input: '$trans',
                      as: 'trans',
                      cond: {
                        $eq: ['$$trans.lang', lang],
                      },
                    },
                  },
                },
              },
            ],
            $more: [
              this.$sets.trans,
              {
                $project: {
                  ...$keysToProject(this.outputKeys),
                  ...(lang && $keysToProject(this.transKeys, '$trans')),
                },
              },
            ],
            ...(per_page && page && { items: [{ $skip: +per_page * (+page - 1) }, { $limit: +per_page }] }),
          }),
        ])
        .toArray();
      this.logger.debug('[query:success]', { total_count, items });
      return omit(toPagingOutput({ items, total_count, keys: this.publicOutputKeys }));
    } catch (err) {
      this.logger.error('[query:error]', err.message);
      throw err;
    }
  }
}
