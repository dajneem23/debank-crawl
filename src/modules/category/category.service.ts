import Container, { Inject, Service, Token } from 'typedi';
import Logger from '@/core/logger';
import { throwErr, toOutPut, toPagingOutput } from '@/utils/common';
import { alphabetSize12 } from '@/utils/randomString';
import AuthSessionModel from '@/modules/auth/authSession.model';
import AuthService from '../auth/auth.service';
import { $lookup, $pagination, $toMongoFilter, $keysToProject } from '@/utils/mongoDB';
import { CategoryModel, CategoryError, CategoryOutput, Category, _category, categoryModelToken } from '.';
import { BaseServiceInput, BaseServiceOutput } from '@/types/Common';
import { isNil, omit } from 'lodash';
import { keys } from 'ts-transformer-keys';

const TOKEN_NAME = '_categoryService';
/**
 * A bridge allows another service access to the Model layer
 * @export CategoryService
 * @class CategoryService
 * @extends {BaseService}
 */
export const categoryServiceToken = new Token<CategoryService>(TOKEN_NAME);
@Service(categoryServiceToken)
export class CategoryService {
  private logger = new Logger('Categories');

  private model = Container.get(categoryModelToken) as CategoryModel;

  @Inject()
  private authSessionModel: AuthSessionModel;

  @Inject()
  private authService: AuthService;

  private error(msg: any) {
    return new CategoryError(msg);
  }

  get outputKeys() {
    return keys<Category>();
  }

  get publicOutputKeys() {
    return ['id', 'title', 'sub_categories', 'weight'];
  }
  get transKeys() {
    return ['title', 'name'];
  }
  get $lookups(): any {
    return {
      sub_categories: $lookup({
        from: 'categories',
        refFrom: '_id',
        refTo: 'sub_categories',
        select: 'title type',
        reName: 'sub_categories',
        operation: '$in',
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
   * @param subject
   * @returns {Promise<Category>}
   */
  async create({ _content, _subject }: BaseServiceInput): Promise<CategoryOutput> {
    try {
      const now = new Date();
      const { name } = _content;
      const value = await this.model.create(
        { name },
        {
          $setOnInsert: {
            ..._category,
            ..._content,
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
      this.logger.debug('create_success', { _content });
      return toOutPut({ item: value, keys: this.outputKeys });
    } catch (err) {
      this.logger.error('create_error', err.message);
      throw err;
    }
  }

  /**
   * Update category
   * @param _id
   * @param _content
   * @param _subject
   * @returns {Promise<Category>}
   */
  async update({ _id, _content, _subject }: BaseServiceInput): Promise<CategoryOutput> {
    try {
      const now = new Date();
      const value = await this.model.update(
        $toMongoFilter({ _id }),
        {
          $set: {
            ..._content,
            ...(_subject && { updated_by: _subject }),
            updated_at: now,
          },
        },
        {
          upsert: false,
          returnDocument: 'after',
        },
      );
      this.logger.debug('update_success', { _content });
      return toOutPut({ item: _content, keys: this.outputKeys });
    } catch (err) {
      this.logger.error('update_error', err.message);
      throw err;
    }
  }

  /**
   * Delete category
   * @param _id
   * @param {ObjectId} _subject
   * @returns {Promise<Category>}
   */
  async delete({ _id, _subject }: BaseServiceInput): Promise<void> {
    try {
      const now = new Date();
      await this.model.delete(
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
      this.logger.debug('delete_success', { _id });
      return;
    } catch (err) {
      this.logger.error('delete_error', err.message);
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
      const { type, lang } = _filter;
      const { page = 1, per_page, sort_by, sort_order } = _query;
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model
        .get(
          $pagination({
            $match: {
              ...(type && {
                type: { $in: Array.isArray(type) ? type : [type] },
              }),
              ...(lang && {
                'trans.lang': { $eq: lang },
              }),
            },
            $lookups: [this.$lookups.sub_categories],
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
      this.logger.debug('query_success', { total_count, items });
      return toPagingOutput({ items, total_count, keys: this.outputKeys });
    } catch (err) {
      this.logger.error('query_error', err.message);
      throw err;
    }
  }
  /**
   * Get Category by ID
   * @param _id - Category ID
   * @returns { Promise<CategoryOutput> } - Category
   */
  async getById({ _id, _filter }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { lang } = _filter;
      const [category] = await this.model
        .get([
          {
            $match: $toMongoFilter({ _id }),
          },
          {
            $limit: 1,
          },
        ])
        .toArray();
      if (isNil(category)) throwErr(new CategoryError('CATEGORY_NOT_FOUND'));
      this.logger.debug('get_success', { category });
      return omit(toOutPut({ item: category }), ['deleted', 'updated_at']);
    } catch (err) {
      this.logger.error('get_error', err.message);
      throw err;
    }
  }
  /**
   *  Search category
   * @param {any} _filter
   * @param {BaseQuery} _query
   * @returns {Promise<BaseServiceOutput>}
   */
  async search({ _filter, _query }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { q, lang, type } = _filter;
      const { page = 1, per_page = 10, sort_by, sort_order } = _query;
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model
        .get([
          ...$pagination({
            $match: {
              ...(type && {
                type: { $in: Array.isArray(type) ? type : [type] },
              }),
              ...(q && {
                $or: [{ $text: { $search: q } }, { title: { $regex: q, $options: 'i' } }],
              }),
            },

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
      this.logger.debug('query_success', { total_count, items });
      return toPagingOutput({ items, total_count, keys: this.publicOutputKeys });
    } catch (err) {
      this.logger.error('query_error', err.message);
      throw err;
    }
  }
}
