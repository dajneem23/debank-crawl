import Container, { Inject, Service, Token } from 'typedi';
import Logger from '@/core/logger';
import { throwErr, toOutPut, toPagingOutput } from '@/utils/common';
import { alphabetSize12 } from '@/utils/randomString';

import { $pagination, $toMongoFilter, $keysToProject } from '@/utils/mongoDB';
import { CategoryModel, CategoryError, CategoryOutput, Category, _category, categoryModelToken } from '.';
import { BaseServiceInput, BaseServiceOutput, PRIVATE_KEYS } from '@/types/Common';
import { isNil, omit } from 'lodash';
import slugify from 'slugify';
import { ObjectId } from 'mongodb';

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

  private error(msg: any) {
    return new CategoryError(msg);
  }

  get outputKeys() {
    return this.model._keys;
  }

  get publicOutputKeys() {
    return ['id', 'title', 'name', 'sub_categories', 'weight', 'rank', 'type'];
  }
  get transKeys() {
    return ['title', 'name'];
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
      const { title, sub_categories = [] } = _content;
      sub_categories.length && (_content.sub_categories = await this.createSubCategories(sub_categories, _subject));
      _content.name = slugify(title, {
        trim: true,
        lower: true,
        remove: /[`~!@#$%^&*()+{}[\]\\|,.//?;':"]/g,
      });
      const value = await this.model.create(
        { name: _content.name },
        {
          ..._category,
          ..._content,
          ...(_subject && { created_by: _subject }),
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
      const { sub_categories = [] } = _content;
      sub_categories.length && (_content.sub_categories = await this.createSubCategories(sub_categories, _subject));
      await this.model.update($toMongoFilter({ _id }), {
        $set: {
          ..._content,
          ...(_subject && { updated_by: _subject }),
        },
      });
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
      await this.model.delete($toMongoFilter({ _id }), {
        $set: {
          ...(_subject && { deleted_by: _subject }),
        },
      });
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
      const { type, lang, rank = 0, q } = _filter;
      const { page = 1, per_page, sort_by, sort_order } = _query;
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model
        .get(
          $pagination({
            $match: {
              ...(type && {
                type: { $in: Array.isArray(type) ? type : [type] },
              }),
              ...(!isNil(rank) && {
                rank: { $eq: rank },
              }),
              ...(lang && {
                'trans.lang': { $eq: lang },
              }),
              ...(q && {
                title: { $regex: q, $options: 'i' },
              }),
            },
            $lookups: [this.model.$lookups.sub_categories],
            $projects: [
              {
                $project: {
                  ...$keysToProject(this.publicOutputKeys),
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
              ...((lang && [this.model.$sets.trans]) || []),
              {
                $project: {
                  ...$keysToProject(this.publicOutputKeys),
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
      return toPagingOutput({ items, total_count, keys: this.publicOutputKeys });
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
  async getById({ _id }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const [category] = await this.model
        .get([
          {
            $match: $toMongoFilter({ _id }),
          },
          this.model.$lookups.sub_categories,
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
   * Get Category by name
   * @param _id - Category ID
   * @returns { Promise<CategoryOutput> } - Category
   */
  async getByName({ _name, _filter, _permission }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { lang, type } = _filter;
      const [category] = await this.model
        .get([
          {
            $match: $toMongoFilter({
              name: { $regex: _name, $options: 'i' },
              ...((type && type) || {}),
              ...(lang && {
                'trans.lang': { $eq: lang },
              }),
            }),
          },
          { ...this.model.$lookups.sub_categories },
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
          ...((lang && [this.model.$sets.trans]) || []),
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
      if (isNil(category)) throwErr(new CategoryError('CATEGORY_NOT_FOUND'));
      this.logger.debug('get_success', { category });
      return _permission == 'private' ? toOutPut({ item: category }) : omit(toOutPut({ item: category }), PRIVATE_KEYS);
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
      const { q, lang, type, rank = 0 } = _filter;
      const { page = 1, per_page = 10 } = _query;
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model
        .get([
          ...$pagination({
            $match: {
              ...(type && {
                type: { $in: Array.isArray(type) ? type : [type] },
              }),
              ...(!isNil(rank) && {
                rank: { $eq: rank },
              }),
              ...(q && {
                $or: [{ $text: { $search: q } }, { title: { $regex: q, $options: 'i' } }],
              }),
            },

            $projects: [
              {
                $project: {
                  ...$keysToProject(this.publicOutputKeys),
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
              ...((lang && [this.model.$sets.trans]) || []),
              {
                $project: {
                  ...$keysToProject(this.publicOutputKeys),
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
  async createSubCategories(categories: Category[], _subject: string, rank = 0): Promise<ObjectId[]> {
    const subCategories = await Promise.all(
      categories.map(async ({ title, type, sub_categories = [] }) => {
        const {
          value,
          ok,
          lastErrorObject: { updatedExisting },
        } = await this.model._collection.findOneAndUpdate(
          {
            name: slugify(title, {
              trim: true,
              lower: true,
              remove: /[`~!@#$%^&*()+{}[\]\\|,.//?;':"]/g,
            }),
          },
          {
            $setOnInsert: {
              title,
              name: slugify(title, {
                trim: true,
                lower: true,
                remove: /[`~!@#$%^&*()+{}[\]\\|,.//?;':"]/g,
              }),
              type,
              sub_categories: await this.createSubCategories(sub_categories, _subject, rank + 1),
              created_at: new Date(),
              updated_at: new Date(),
              rank,
              deleted: false,
              created_by: _subject,
            },
          },
          {
            upsert: true,
            returnDocument: 'after',
          },
        );
        return value._id;
      }),
    );
    return subCategories;
  }
}
