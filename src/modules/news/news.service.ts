import Container, { Inject, Service, Token } from 'typedi';
import Logger from '@/core/logger';
import { throwErr, toOutPut, toPagingOutput } from '@/utils/common';
import { $toObjectId, $pagination, $toMongoFilter, $keysToProject } from '@/utils/mongoDB';
import { News, NewsError, NewsModel, _news, newsErrors, newsModelToken } from '.';
import { BaseServiceInput, BaseServiceOutput, NewsStatus, PRIVATE_KEYS } from '@/types/Common';
import { isNil, omit } from 'lodash';
import { UserModel, UserError } from '../index';
import slugify from 'slugify';

const TOKEN_NAME = '_newsService';
export const NewsServiceToken = new Token<NewsService>(TOKEN_NAME);
/**
 * @class NewsService
 * @description News service: News service for all news related operations
 * @extends BaseService
 */
@Service(NewsServiceToken)
export class NewsService {
  private logger = new Logger('News');

  private model = Container.get(newsModelToken) as NewsModel;

  @Inject()
  private userModel: UserModel;

  private userErrors(err: any) {
    return new UserError(err);
  }

  private error(msg: keyof typeof newsErrors) {
    return new NewsError(msg);
  }

  get transKeys() {
    return ['title', 'slug', 'lang', 'headings', 'summary', 'content'];
  }

  get outputKeys(): typeof this.model._keys {
    return this.model._keys;
  }

  get publicOutputKeys() {
    return [
      'id',
      'title',
      'slug',
      'headings',
      'summary',
      'slug',
      'photos',
      'views',
      'stars',
      'categories:',
      'number_relate_article',
      'created_at',
      'author',
      'status',
      'meta',
    ];
  }

  /**
   * Create a news
   * @param _content
   * @param _subject
   * @returns {Promise<BaseServiceOutput>}
   */
  async create({ _content, _subject }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const now = new Date();
      let { trans = [] } = _content;
      const { title } = _content;
      trans = await Promise.all(
        trans.map(async (item: any) => {
          const slug = slugify(item.title, {
            trim: true,
            lower: true,
          });
          return {
            ...item,
            slug: (await this.model._collection.findOne({ $or: [{ 'trans.slug': slug }, { slug }] }))
              ? slug + '-' + now.getTime()
              : slug,
          };
        }),
      );
      const _slug = slugify(title, {
        trim: true,
        lower: true,
      });
      const slug = (await this.model._collection.findOne({ $or: [{ 'trans.slug': _slug }, { slug: _slug }] }))
        ? _slug + '-' + now.getTime()
        : _slug;
      const value = await this.model.create(
        {
          'trans.slug': { $in: trans.map((item: any) => item.slug) },
          slug,
        },
        {
          ..._news,
          ..._content,
          trans,
          slug,
          deleted: false,
          ...(_subject && { created_by: _subject }),
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
   * Update
   * @param _id
   * @param _content
   * @param _subject
   * @returns {Promise<News>}
   */
  async update({ _id, _content, _subject }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const now = new Date();
      const { title, trans = [] } = _content;
      const _slug = title
        ? slugify(title, {
            trim: true,
            lower: true,
          })
        : '';
      const value = await this.model.update(
        $toMongoFilter({
          _id,
          $or: [
            {
              status: {
                $not: {
                  $eq: NewsStatus.PROCESSING,
                },
              },
            },
            {
              updated_by: _subject,
            },
          ],
        }),
        {
          $set: {
            ..._content,
            ...(trans.length && {
              trans: await Promise.all(
                trans.map(async (item: any) => {
                  const slug = slugify(item.title, {
                    trim: true,
                    lower: true,
                  });
                  return {
                    ...item,
                    slug: (await this.model._collection.findOne({
                      $or: [{ 'trans.slug': slug }, { slug }],
                      $and: [
                        {
                          _id: {
                            $not: {
                              $eq: $toObjectId(_id),
                            },
                          },
                        },
                      ],
                    }))
                      ? slug + '-' + now.getTime()
                      : slug,
                  };
                }),
              ),
            }),
            ...(title && {
              slug: (await this.model._collection.findOne({
                $and: [
                  {
                    _id: {
                      $not: {
                        $eq: $toObjectId(_id),
                      },
                    },
                  },
                ],
                $or: [{ 'trans.slug': _slug }, { slug: _slug }],
              }))
                ? _slug + '-' + now.getTime()
                : _slug,
            }),
            ...(_subject && { updated_by: _subject }),
            updated_at: now,
          },
        },
        {
          upsert: false,
          returnDocument: 'after',
        },
      );
      this.logger.debug('update_success', { value });
      return toOutPut({ item: value, keys: this.outputKeys });
    } catch (err) {
      this.logger.error('update_error', err.message);
      throw err;
    }
  }
  /**
   * Update status
   * @param {BaseServiceInput} { _id, _content, _subject }
   * @returns {Promise<BaseServiceOutput>}
   */
  async updateStatus({ _id, _filter, _subject, _role }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { status } = _filter;
      const now = new Date();
      const value = await this.model.update(
        $toMongoFilter({
          _id,
          $or: [
            {
              status: {
                $not: {
                  $eq: NewsStatus.PROCESSING,
                },
              },
            },
            {
              updated_by: _subject,
            },
          ],
        }),
        {
          $set: {
            status,
            ...(_subject && { updated_by: _subject }),
            updated_at: now,
          },
        },
        {
          upsert: false,
          returnDocument: 'after',
        },
      );
      this.logger.debug('update_success', { status });
      return toOutPut({ item: { status } });
    } catch (err) {
      this.logger.error('update_error', err.message);
      throw err;
    }
  }
  /**
   *
   * @param {BaseServiceInput} { _id }
   * @returns { Promise<BaseServiceOutput> } { item: views }
   */
  async updateViews({ _id }: BaseServiceInput, view = 1): Promise<BaseServiceOutput> {
    try {
      const views = await this.model.update(
        $toMongoFilter({ _id }),
        {
          $inc: { views: view },
        },
        {
          upsert: false,
          returnDocument: 'after',
        },
      );
      this.logger.debug('update_success', { _id });
      return toOutPut({ item: { views } });
    } catch (err) {
      this.logger.error('update_error', err.message);
      throw err;
    }
  }
  /**
   * Delete
   * @param _id
   * @param {ObjectId} _subject
   * @returns {Promise<void>}
   */
  async delete({ _id, _subject }: BaseServiceInput): Promise<void> {
    try {
      await this.model.delete(
        { _id },
        {
          deleted: true,
          ...(_subject && { deleted_by: _subject }),
          deleted_at: new Date(),
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
   *  Query
   * @param {any} _filter
   * @param {BaseQuery} _query
   * @returns {Promise<BaseServiceOutput>}
   *
   **/
  async query({ _filter, _query }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { q, lang, category, status } = _filter;
      const { page = 1, per_page = 10, sort_by, sort_order } = _query;
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model
        .get([
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
              ...(category && {
                $or: [
                  { categories: { $in: Array.isArray(category) ? $toObjectId(category) : $toObjectId([category]) } },
                ],
              }),
              ...(q && {
                $or: [{ title: { $regex: q, $options: 'i' } }, { 'trans.title': { $regex: q, $options: 'i' } }],
              }),
              ...(status && {
                $eq: { status },
              }),
            },
            $addFields: this.model.$addFields.categories,
            $lookups: [this.model.$lookups.author, this.model.$lookups.categories],
            $sets: [this.model.$sets.country, this.model.$sets.author],
            $projects: [
              {
                $project: {
                  ...$keysToProject(this.publicOutputKeys),
                  trans: {
                    $filter: {
                      input: '$trans',
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
              this.model.$sets.trans,
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
        ])
        .toArray();
      this.logger.debug('query_success', { total_count, items });
      return toPagingOutput({ items, total_count, keys: this.publicOutputKeys });
    } catch (err) {
      this.logger.error('query_error', err.message);
      throw err;
    }
  }
  /**
   * Get by ID
   * @param id - Event ID
   * @returns { Promise<BaseServiceOutput> } - Event
   */
  async getById({ _id, _filter, _permission = 'public' }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { lang } = _filter;
      const [item] = await this.model
        .get([
          {
            $match: {
              ...$toMongoFilter({ _id }),
              ...(lang && {
                'trans.lang': { $eq: lang },
              }),
            },
          },
          {
            $addFields: this.model.$addFields.categories,
          },
          this.model.$lookups.categories,
          this.model.$lookups.author,
          this.model.$lookups.coin_tags,
          this.model.$lookups.company_tags,
          this.model.$lookups.person_tags,
          this.model.$lookups.product_tags,
          this.model.$lookups.event_tags,
          this.model.$sets.author,
          {
            $project: {
              ...$keysToProject(this.outputKeys),
              trans: {
                $filter: {
                  input: '$trans',
                  as: 'content',
                  cond: {
                    $eq: ['$$content.lang', lang],
                  },
                },
              },
            },
          },
          this.model.$sets.trans,
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
      this.logger.debug('get_success', { item });
      return _permission == 'private' ? omit(toOutPut({ item }), 'trans') : omit(toOutPut({ item }), PRIVATE_KEYS);
    } catch (err) {
      this.logger.error('get_error', err.message);
      throw err;
    }
  }
  /**
   * Get News by slug
   * @param {BaseServiceInput} { _id, _filter }
   * @returns {Promise<BaseServiceOutput>}
   * @returns
   */
  async getBySlug({ _slug, _filter, _permission = 'public' }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { lang } = _filter;
      const [item] = await this.model
        .get([
          {
            $match: $toMongoFilter({
              $or: [
                {
                  'trans.slug': _slug,
                },
                {
                  slug: _slug,
                },
              ],
              $and: [
                {
                  deleted: false,
                  ...(lang && {
                    'trans.lang': { $eq: lang },
                  }),
                },
              ],
            }),
          },
          {
            $addFields: this.model.$addFields.categories,
          },
          this.model.$lookups.categories,
          this.model.$lookups.author,
          this.model.$lookups.coin_tags,
          this.model.$lookups.company_tags,
          this.model.$lookups.person_tags,
          this.model.$lookups.product_tags,
          this.model.$lookups.event_tags,
          this.model.$sets.author,
          {
            $project: {
              ...$keysToProject(this.outputKeys),
              trans: {
                $filter: {
                  input: '$trans',
                  as: 'content',
                  cond: {
                    $eq: ['$$content.lang', lang],
                  },
                },
              },
            },
          },
          this.model.$sets.trans,
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
      this.logger.debug('get_success', { item });
      return _permission == 'private' ? toOutPut({ item }) : omit(toOutPut({ item }), PRIVATE_KEYS);
    } catch (err) {
      this.logger.error('get_error', err.message);
      throw err;
    }
  }
  /**
   * search news
   * @param {BaseServiceInput} { _id, _filter, _query }
   * @returns {Promise<BaseServiceOutput>}
   */
  async search({ _filter, _query }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { q, lang } = _filter;
      const { page = 1, per_page = 10, sort_by, sort_order } = _query;
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model
        .get([
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
              $or: [
                { $text: { $search: q } },
                { title: { $regex: q, $options: 'i' } },
                { 'trans.title': { $regex: q, $options: 'i' } },
              ],
            },
            $addFields: this.model.$addFields.categories,
            $lookups: [this.model.$lookups.author, this.model.$lookups.categories],
            $sets: [this.model.$sets.author],
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
              this.model.$sets.trans,
              {
                $project: {
                  ...$keysToProject(this.publicOutputKeys),
                  ...(lang && $keysToProject(this.transKeys, '$trans')),
                  meta: '$$SEARCH_META',
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

  /**
   * Get related news
   * @param {ObjectId} _id
   * @param {BaseQuery} _query
   * @param {} _filter
   * @returns {Promise<BaseServiceOutput>}
   */
  async getRelated({ _subject, _filter, _query }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { lang } = _filter;
      const { page = 1, per_page = 10, sort_by = 'created_at', sort_order = 'desc' } = _query;
      const { followings = [] } = await this.userModel.collection.findOne({ id: _subject });
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model
        .get([
          ...$pagination({
            $match: {
              $and: [
                ...[
                  (lang && {
                    'trans.lang': { $eq: lang },
                  }) ||
                    {},
                ],
                ...[
                  (followings?.length && {
                    categories: {
                      $in: Array.isArray(followings) ? followings : [],
                    },
                  }) ||
                    {},
                ],
                {
                  deleted: false,
                },
              ],
            },
            $sets: [this.model.$sets.author],
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
              this.model.$sets.trans,
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
        ])
        .toArray();
      this.logger.debug('query_success', { total_count, items });
      return toPagingOutput({ items, total_count, keys: this.publicOutputKeys });
    } catch (err) {
      this.logger.error('query_error', err.message);
      throw err;
    }
  }
  /**
   * Get important news
   * @param {ObjectId} _id
   * @param {any}  _query
   * @param {any} _filter
   * @returns {Promise<BaseServiceOutput>}
   */
  async getImportant({ _filter, _query }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { lang } = _filter;
      const { page = 1, per_page } = _query;
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model
        .get([
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
              this.model.$sets.trans,
              {
                $project: {
                  ...$keysToProject(this.outputKeys),
                  ...(lang && $keysToProject(this.transKeys, '$trans')),
                },
              },
            ],
            $sort: { number_relate_article: -1 },
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
  /**
   *
   * @param {ObjectId} id -  ID
   * @returns { Promise<BaseServiceOutput> }
   */
  async checkNewsStatus({ _id, _subject }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const [item] = await this.model
        .get([
          {
            $match: {
              ...$toMongoFilter({ _id }),
              $and: [
                {
                  status: {
                    $eq: NewsStatus.PROCESSING,
                  },
                  updated_by: {
                    $not: {
                      $eq: _subject,
                    },
                  },
                },
              ],
            },
          },
          {
            $project: {
              _id: 1,
            },
          },
          {
            $limit: 1,
          },
        ])
        .toArray();
      this.logger.debug('get_success', { item });
      return toOutPut({
        item: {
          result: isNil(item),
        },
      });
    } catch (err) {
      this.logger.error('get_error', err.message);
      throw err;
    }
  }
}
