import { Inject, Service } from 'typedi';
import Logger from '@/core/logger';
import { throwErr, toOutPut, toPagingOutput } from '@/utils/common';
import { alphabetSize12 } from '@/utils/randomString';
import { $lookup, $toObjectId, $pagination, $toMongoFilter, $queryByList, $keysToProject } from '@/utils/mongoDB';
import { NewsError, NewsModel, _news } from '.';
import { BaseServiceInput, BaseServiceOutput, NewsStatus, PRIVATE_KEYS } from '@/types/Common';
import { isNil, omit } from 'lodash';
import { UserModel } from '../index';
import slugify from 'slugify';
@Service()
export class NewsService {
  private logger = new Logger('NewsService');

  @Inject()
  private model: NewsModel;

  @Inject()
  private userModel: UserModel;

  private error(msg: any) {
    return new NewsError(msg);
  }

  /**
   * A bridge allows another service access to the Model layer
   */
  get collection() {
    return this.model.collection;
  }

  get transKeys() {
    return ['title', 'slug', 'lang', 'headings', 'summary', 'content'];
  }

  get outputKeys() {
    return ['id', ...Object.keys(_news), 'author'];
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
      coin_tags: $lookup({
        from: 'coins',
        refFrom: '_id',
        refTo: 'coin_tags',
        select: 'name',
        reName: 'coin_tags',
        operation: '$in',
      }),
      company_tags: $lookup({
        from: 'companies',
        refFrom: '_id',
        refTo: 'company_tags',
        select: 'name',
        reName: 'company_tags',
        operation: '$in',
      }),
      product_tags: $lookup({
        from: 'products',
        refFrom: '_id',
        refTo: 'product_tags',
        select: 'name',
        reName: 'product_tags',
        operation: '$in',
      }),
      person_tags: $lookup({
        from: 'persons',
        refFrom: '_id',
        refTo: 'person_tags',
        select: 'name',
        reName: 'person_tags',
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
      let { trans = [] } = _content;
      const { title } = _content;
      const { categories = [], coin_tags = [], company_tags = [], product_tags = [], person_tags } = _content;
      const validCategories = categories.length
        ? await $queryByList({
            collection: 'categories',
            values: categories,
          })
        : true;
      const validCoinTags = coin_tags.length
        ? await $queryByList({
            collection: 'coins',
            values: coin_tags,
          })
        : true;
      const validCompanyTags = company_tags.length
        ? await $queryByList({
            collection: 'companies',
            values: company_tags,
          })
        : true;
      const validProductTags = product_tags.length
        ? await $queryByList({
            collection: 'products',
            values: product_tags,
          })
        : true;
      const validPersonTags = person_tags.length
        ? await $queryByList({
            collection: 'persons',
            values: person_tags,
          })
        : true;
      if (!(validCategories && validCoinTags && validProductTags && validCompanyTags && validPersonTags)) {
        throwErr(this.error('INPUT_INVALID'));
      }
      trans = await Promise.all(
        trans.map(async (item: any) => {
          const slug = slugify(item.title, {
            trim: true,
            lower: true,
          });
          return {
            ...item,
            slug: (await this.model.collection.findOne({ $or: [{ 'trans.slug': slug }, { slug }] }))
              ? slug + '-' + now.getTime()
              : slug,
          };
        }),
      );
      const _slug = slugify(title, {
        trim: true,
        lower: true,
      });
      const slug = (await this.model.collection.findOne({ $or: [{ 'trans.slug': _slug }, { slug: _slug }] }))
        ? _slug + '-' + now.getTime()
        : _slug;
      const {
        value,
        ok,
        lastErrorObject: { updatedExisting },
      } = await this.model.collection.findOneAndUpdate(
        {
          'trans.slug': { $in: trans.map((item: any) => item.slug) },
          slug,
        },
        {
          $setOnInsert: {
            ..._news,
            ..._content,
            trans,
            slug,
            ...(categories.length && { categories: $toObjectId(categories) }),
            ...(product_tags.length && { product_tags: $toObjectId(product_tags) }),
            ...(coin_tags.length && { coin_tags: $toObjectId(coin_tags) }),
            ...(company_tags.length && { company_tags: $toObjectId(company_tags) }),
            ...(person_tags.length && { person_tags: $toObjectId(person_tags) }),
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
      const { title, trans = [] } = _content;
      const { categories = [], coin_tags = [], company_tags = [], product_tags = [], person_tags = [] } = _content;
      const validCategories = categories.length
        ? await $queryByList({
            collection: 'categories',
            values: categories,
          })
        : true;
      const validCoinTags = coin_tags.length
        ? await $queryByList({
            collection: 'coins',
            values: coin_tags,
          })
        : true;
      const validCompanyTags = company_tags.length
        ? await $queryByList({
            collection: 'companies',
            values: company_tags,
          })
        : true;
      const validProductTags = product_tags.length
        ? await $queryByList({
            collection: 'products',
            values: product_tags,
          })
        : true;
      const validPersonTags = person_tags.length
        ? await $queryByList({
            collection: 'persons',
            values: person_tags,
          })
        : true;
      if (!(validCategories && validCoinTags && validProductTags && validCompanyTags && validPersonTags)) {
        throwErr(this.error('INPUT_INVALID'));
      }
      const _slug = title
        ? slugify(title, {
            trim: true,
            lower: true,
          })
        : '';
      const {
        ok,
        value,
        lastErrorObject: { updatedExisting },
      } = await this.model.collection.findOneAndUpdate(
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
                    slug: (await this.model.collection.findOne({
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
              slug: (await this.model.collection.findOne({
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
            ...(categories.length && { categories: $toObjectId(categories) }),
            ...(product_tags.length && { product_tags: $toObjectId(product_tags) }),
            ...(coin_tags.length && { coin_tags: $toObjectId(coin_tags) }),
            ...(company_tags.length && { company_tags: $toObjectId(company_tags) }),
            ...(person_tags.length && { person_tags: $toObjectId(person_tags) }),
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
      this.logger.debug('[update:success]', { value });
      return toOutPut({ item: value, keys: this.outputKeys });
    } catch (err) {
      this.logger.error('[update:error]', err.message);
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
  async updateStatus({ _id, _filter, _subject, _role }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { status } = _filter;
      const now = new Date();
      const {
        ok,
        value,
        lastErrorObject: { updatedExisting },
      } = await this.model.collection.findOneAndUpdate(
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
      if (!ok) {
        throwErr(this.error('DATABASE_ERROR'));
      }
      if (!updatedExisting) {
        throwErr(this.error('NOT_FOUND'));
      }
      this.logger.debug('[update:success]', { status });
      return toOutPut({ item: { status } });
    } catch (err) {
      this.logger.error('[update:error]', err.message);
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
      const { q, lang, category, status } = _filter;
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
            $lookups: [this.$lookups.user, this.$lookups.categories],
            $sets: [this.$sets.country, this.$sets.author],
            $projects: [
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
        ])
        .toArray();
      this.logger.debug('[query:success]', { total_count, items });
      return toPagingOutput({ items, total_count, keys: this.publicOutputKeys });
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
  async getById({ _id, _filter, _permission = 'public' }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { lang } = _filter;
      const [item] = await this.model.collection
        .aggregate([
          {
            $match: {
              ...$toMongoFilter({ _id }),
              ...(lang && {
                'trans.lang': { $eq: lang },
              }),
            },
          },
          this.$lookups.categories,
          this.$lookups.user,
          this.$lookups.coin_tags,
          this.$lookups.company_tags,
          this.$lookups.product_tags,
          // this.$lookups.person_tags,
          this.$sets.author,
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
      return _permission == 'private' ? omit(toOutPut({ item }), 'trans') : omit(toOutPut({ item }), PRIVATE_KEYS);
    } catch (err) {
      this.logger.error('[get:error]', err.message);
      throw err;
    }
  }
  /**
   *
   * @param {BaseServiceInput} { _id, _filter }
   * @returns {Promise<BaseServiceOutput>}
   * @returns
   */
  async getBySlug({ _id, _filter, _permission = 'public' }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { lang } = _filter;
      const [item] = await this.model.collection
        .aggregate([
          {
            $match: $toMongoFilter({
              $or: [
                {
                  'trans.slug': {
                    $regex: _id,
                    $options: 'i',
                  },
                },
                {
                  slug: {
                    $regex: _id,
                    $options: 'i',
                  },
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
          this.$lookups.categories,
          this.$lookups.user,
          this.$lookups.coin_tags,
          this.$lookups.company_tags,
          this.$lookups.person_tags,
          this.$sets.author,
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
              $or: [
                { $text: { $search: q } },
                { title: { $regex: q, $options: 'i' } },
                { 'trans.title': { $regex: q, $options: 'i' } },
              ],
            },
            $lookups: [this.$lookups.user, this.$lookups.categories],
            $sets: [this.$sets.author],
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
                  meta: '$$SEARCH_META',
                },
              },
            ],
            ...(per_page && page && { items: [{ $skip: +per_page * (+page - 1) }, { $limit: +per_page }] }),
          }),
        ])
        .toArray();
      this.logger.debug('[query:success]', { total_count, items });
      return toPagingOutput({ items, total_count, keys: [...this.publicOutputKeys, 'meta'] });
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
  async getRelated({ _subject, _filter, _query }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { lang } = _filter;
      const { page = 1, per_page = 10, sort_by = 'created_at', sort_order = 'desc' } = _query;
      const user = await this.userModel.collection.findOne({ id: _subject });
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model.collection
        .aggregate([
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
                  (user &&
                    user.followings.length && {
                      categories: {
                        $in: Array.isArray(user.followings) ? user.followings : [],
                      },
                    }) ||
                    {},
                ],
                {
                  deleted: false,
                },
              ],
            },
            $sets: [this.$sets.author],
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
        ])
        .toArray();
      this.logger.debug('[query:success]', { total_count, items });
      return toPagingOutput({ items, total_count, keys: this.publicOutputKeys });
    } catch (err) {
      this.logger.error('[query:error]', err.message);
      throw err;
    }
  }
  /**
   * Get important news
   * @param {ObjectId} _id
   * @param  _query
   * @param  _filter
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
              this.$sets.trans,
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
      this.logger.debug('[query:success]', { total_count, items });
      return toPagingOutput({ items, total_count, keys: this.publicOutputKeys });
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
  async checkNewsStatus({ _id, _subject }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const [item] = await this.model.collection
        .aggregate([
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
      this.logger.debug('[get:success]', { item });
      return toOutPut({
        item: {
          result: isNil(item),
        },
      });
    } catch (err) {
      this.logger.error('[get:error]', err.message);
      throw err;
    }
  }
}
