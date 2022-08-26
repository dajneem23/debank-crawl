import { Inject, Service } from 'typedi';
import Logger from '@/core/logger';
import { throwErr, toOutPut, toPagingOutput } from '@/utils/common';
import { alphabetSize12 } from '@/utils/randomString';
import { $lookup, $toObjectId, $pagination, $toMongoFilter, $queryByList, $keysToProject } from '@/utils/mongoDB';
import { NewsError, NewsModel, _news } from '.';
import { BaseServiceInput, BaseServiceOutput } from '@/types/Common';
import { isNil, omit } from 'lodash';
import { UserModel, UserError } from '../index';

@Service()
export class NewsService {
  private logger = new Logger('NewsService');

  @Inject()
  private model: NewsModel;

  @Inject()
  private userModel: UserModel;

  private userErrors(err: any) {
    return new UserError(err);
  }

  private error(msg: any) {
    return new NewsError(msg);
  }

  /**
   * A bridge allows another service access to the Model layer
   */
  get collection() {
    return this.model.collection;
  }

  get childKeys() {
    return ['title', 'lang', 'headings', 'summary'];
  }

  get outputKeys() {
    return [
      'id',
      'slug',
      'company_tags',
      'coin_tags',
      'keywords',
      'photos',
      'views',
      'star',
      'categories',
      'author',
      'number_relate_article',
      'created_at',
    ];
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
        select: 'full_name avatar',
        reName: 'author',
        operation: '$eq',
      }),
      news: $lookup({
        from: 'news',
        refFrom: 'categories',
        refTo: 'followings',
        select: 'title',
        reName: 'news',
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
      contents: {
        $set: {
          contents: { $first: '$contents' },
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
      const { slug } = _content;
      const { categories } = _content;
      const categoriesIdExist =
        !!categories && categories.length > 0
          ? await $queryByList({ collection: 'categories', values: categories })
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
          slug,
        },
        {
          $setOnInsert: {
            ..._news,
            ..._content,
            categories: categories ? $toObjectId(categories) : [],
            deleted: false,
            ...(_subject && { created_by: _subject }),
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
   * @returns {Promise<News>}
   */
  async update({ _id, _content, _subject }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const now = new Date();

      const { categories } = _content;
      const categoriesIdExist =
        !!categories && categories.length > 0
          ? await $queryByList({ collection: 'categories', values: categories })
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
      const { q, lang, category } = _filter;
      const { page = 1, per_page, sort_by, sort_order } = _query;
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model.collection
        .aggregate([
          ...$pagination({
            $match: {
              $and: [{ 'contents.lang': lang }],
              ...(category && {
                $or: [{ categories: { $in: Array.isArray(category) ? category : [category] } }],
              }),
              ...(q && {
                $or: [{ 'contents.title': { $regex: q, $options: 'i' } }],
              }),
            },
            $lookups: [this.$lookups.user, this.$lookups.categories],
            $sets: [this.$sets.country, this.$sets.author],
            $projects: [
              {
                $project: {
                  ...$keysToProject(this.outputKeys),
                  contents: {
                    $filter: {
                      input: '$contents',
                      as: 'content',
                      cond: {
                        $eq: ['$$content.lang', lang],
                      },
                    },
                  },
                },
              },
            ],
            $more: [
              this.$sets.contents,
              {
                $project: {
                  ...$keysToProject(this.outputKeys),
                  ...$keysToProject(this.childKeys, '$contents'),
                },
              },
            ],
            ...(sort_by && sort_order && { $sort: { [sort_by]: sort_order == 'asc' ? 1 : -1 } }),
            ...(per_page && page && { items: [{ $skip: +per_page * (+page - 1) }, { $limit: +per_page }] }),
          }),
        ])
        .toArray();
      this.logger.debug('[query:success]', { total_count, items });
      return toPagingOutput({ items, total_count, keys: [...this.outputKeys, ...this.childKeys] });
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
          this.$lookups.categories,
          this.$lookups.user,
          this.$sets.author,
          {
            $limit: 1,
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
  async updateViews({ _id }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const {
        ok,
        value: { views },
        lastErrorObject: { updatedExisting },
      } = await this.model.collection.findOneAndUpdate(
        $toMongoFilter({ _id }),
        {
          $inc: { views: 1 },
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
      this.logger.debug('[update:success]', { _id });
      return toOutPut({ item: { views } });
    } catch (err) {
      this.logger.error('[update:error]', err.message);
      throw err;
    }
  }
  async search({ _filter, _query }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { q, lang } = _filter;
      const { page = 1, per_page, sort_by, sort_order } = _query;
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model.collection
        .aggregate([
          ...$pagination({
            $match: {
              $and: [{ 'contents.lang': lang }],
              ...(q && {
                $or: [{ $text: { $search: q } }, { 'contents.title': { $regex: q, $options: 'i' } }],
              }),
            },
            // $search: {
            //   regex: {
            //     path: 'contents.title',
            //     query: q,
            //   },
            //   count: per_page,
            // },
            $lookups: [this.$lookups.user, this.$lookups.categories],
            $sets: [this.$sets.country, this.$sets.author],
            $projects: [
              {
                $project: {
                  ...$keysToProject(this.outputKeys),
                  contents: {
                    $filter: {
                      input: '$contents',
                      as: 'content',
                      cond: {
                        $eq: ['$$content.lang', lang],
                      },
                    },
                  },
                },
              },
            ],
            $more: [
              this.$sets.contents,
              {
                $project: {
                  ...$keysToProject(this.outputKeys),
                  ...$keysToProject(this.childKeys, '$contents'),
                },
              },
            ],
            ...(per_page && page && { items: [{ $skip: +per_page * (+page - 1) }, { $limit: +per_page }] }),
          }),
        ])
        .toArray();
      this.logger.debug('[query:success]', { total_count, items });
      return toPagingOutput({ items, total_count, keys: [...this.outputKeys, ...this.childKeys] });
    } catch (err) {
      this.logger.error('[query:error]', err.message);
      throw err;
    }
  }

  /**
   * Get related news
   * @param {ObjectId} _id
   * @param {BaseQuery} _query
   * @param {} _filter
   * @returns {Promise<BaseServiceOutput>}
   */
  async getRelated({ _id, _filter, _query }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { lang } = _filter;
      const { page = 1, per_page, sort_by, sort_order } = _query;
      const user = await this.userModel.collection.findOne({ id: _id });
      if (isNil(user)) throwErr(this.userErrors('USER_NOT_FOUND'));
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model.collection
        .aggregate([
          ...$pagination({
            $match: {
              $and: [
                { 'contents.lang': lang },
                {
                  categories: {
                    $in: Array.isArray(user.followings) ? user.followings : [],
                  },
                },
                {
                  deleted: false,
                },
              ],
            },
            $projects: [
              {
                $project: {
                  ...$keysToProject(this.outputKeys),
                  contents: {
                    $filter: {
                      input: '$contents',
                      as: 'content',
                      cond: {
                        $eq: ['$$content.lang', lang],
                      },
                    },
                  },
                },
              },
            ],
            $more: [
              this.$sets.contents,
              {
                $project: {
                  ...$keysToProject(this.outputKeys),
                  ...$keysToProject(this.childKeys, '$contents'),
                },
              },
            ],
            ...(sort_by && sort_order && { $sort: { [sort_by]: sort_order == 'asc' ? 1 : -1 } }),
            ...(per_page && page && { items: [{ $skip: +per_page * (+page - 1) }, { $limit: +per_page }] }),
          }),
        ])
        .toArray();
      this.logger.debug('[query:success]', { total_count, items });
      return toPagingOutput({ items, total_count, keys: [...this.outputKeys, ...this.childKeys] });
    } catch (err) {
      this.logger.error('[query:error]', err.message);
      throw err;
    }
  }
  /**
   * Get important news
   * @param {ObjectId} _id
   * @param {BaseQuery} _query
   * @param {} _filter
   * @returns {Promise<BaseServiceOutput>}
   */
  async getImportant({ _filter, _query }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { lang } = _filter;
      const { page = 1, per_page } = _query;
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model.collection
        .aggregate([
          ...$pagination({
            $match: {
              $and: [
                { 'contents.lang': lang },
                {
                  deleted: false,
                },
              ],
            },
            $projects: [
              {
                $project: {
                  ...$keysToProject(this.outputKeys),
                  contents: {
                    $filter: {
                      input: '$contents',
                      as: 'content',
                      cond: {
                        $eq: ['$$content.lang', lang],
                      },
                    },
                  },
                },
              },
            ],
            $more: [
              this.$sets.contents,
              {
                $project: {
                  ...$keysToProject(this.outputKeys),
                  ...$keysToProject(this.childKeys, '$contents'),
                },
              },
            ],
            $sort: { number_relate_article: -1 },
            ...(per_page && page && { items: [{ $skip: +per_page * (+page - 1) }, { $limit: +per_page }] }),
          }),
        ])
        .toArray();
      this.logger.debug('[query:success]', { total_count, items });
      return toPagingOutput({ items, total_count, keys: [...this.outputKeys, ...this.childKeys] });
    } catch (err) {
      this.logger.error('[query:error]', err.message);
      throw err;
    }
  }
}
