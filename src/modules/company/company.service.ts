import Container, { Inject, Service, Token } from 'typedi';
import Logger from '@/core/logger';
import { throwErr, toOutPut, toPagingOutput } from '@/utils/common';
import { alphabetSize12 } from '@/utils/randomString';
import AuthSessionModel from '@/modules/auth/authSession.model';
import AuthService from '../auth/auth.service';
import { $toObjectId, $pagination, $toMongoFilter, $queryByList, $keysToProject } from '@/utils/mongoDB';
import { CompanyError, _company, companyModelToken, companyErrors } from '.';
import { BaseServiceInput, BaseServiceOutput, PRIVATE_KEYS } from '@/types/Common';
import { isNil, omit } from 'lodash';
const TOKEN_NAME = '_companyService';
/**
 * A bridge allows another service access to the Model layer
 * @export CompanyService
 * @class CompanyService
 * @extends {BaseService}
 */
export const CompanyServiceToken = new Token<CompanyService>(TOKEN_NAME);
/**
 * @class CompanyService
 * @extends BaseService
 * @description Company Service for all company related operations
 */
@Service(CompanyServiceToken)
export class CompanyService {
  private logger = new Logger('CompanyService');

  private model = Container.get(companyModelToken);

  @Inject()
  private authSessionModel: AuthSessionModel;

  @Inject()
  private authService: AuthService;

  private error(msg: keyof typeof companyErrors) {
    return new CompanyError(msg);
  }

  get outputKeys(): typeof this.model._keys {
    return this.model._keys;
  }
  get publicOutputKeys() {
    return ['id', 'avatar', 'slug', 'categories', 'about', 'short_description', 'name', 'author'];
  }
  get transKeys() {
    return ['about', 'short_description', 'features', 'services'];
  }

  /**
   * Generate ID
   */
  static async generateID() {
    return alphabetSize12();
  }
  /**
   * Create a new company
   * @param _content
   * @param _subject
   * @returns {Promise<BaseServiceOutput>}
   */
  async create({ _content, _subject }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { name, categories = [], trans = [] } = _content;
      const value = await this.model.create(
        {
          name,
        },
        {
          ..._company,
          ..._content,
          categories,
          trans,
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
   * Update company
   * @param _id
   * @param _content
   * @param _subject
   * @returns {Promise<Company>}
   */
  async update({ _id, _content, _subject }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const value = await this.model.update($toMongoFilter({ _id }), {
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
   * Delete company
   * @param _id
   * @param {ObjectId} _subject
   * @returns {Promise<void>}
   */
  async delete({ _id, _subject }: BaseServiceInput): Promise<void> {
    try {
      await this.model.delete($toMongoFilter({ _id }), {
        ...(_subject && { deleted_by: _subject }),
      });
      this.logger.debug('delete_success', { _id });
      return;
    } catch (err) {
      this.logger.error('delete_error', err.message);
      throw err;
    }
  }

  /**
   *  Query company
   * @param {any} _filter
   * @param {BaseQuery} _query
   * @returns {Promise<BaseServiceOutput>}
   *
   **/
  async query({ _filter, _query, _permission = 'public' }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { lang, q, categories = [], deleted = false } = _filter;
      const { page = 1, per_page, sort_by, sort_order } = _query;
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model
        .get(
          $pagination({
            $match: {
              ...((_permission === 'private' && {
                deleted,
              }) || {
                deleted: false,
              }),
              ...(q && {
                name: { $regex: q, $options: 'i' },
              }),
              ...(categories.length && {
                $or: [
                  {
                    categories: {
                      $in: $toObjectId(categories),
                    },
                  },
                ],
              }),
              ...(lang && {
                'trans.lang': { $eq: lang },
              }),
            },
            $addFields: this.model.$addFields.categories,
            $lookups: [this.model.$lookups.categories],
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
      return toPagingOutput({
        items,
        total_count,
        keys: _permission == 'public' ? this.publicOutputKeys : this.outputKeys,
      });
    } catch (err) {
      this.logger.error('query_error', err.message);
      throw err;
    }
  }
  /**
   * Get Company by ID
   * @param id - Company ID
   * @returns { Promise<BaseServiceOutput> } - Company
   */
  async getById({ _id, _filter, _permission = 'public' }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { lang } = _filter;
      const [item] = await this.model
        .get([
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
          {
            $addFields: this.model.$addFields.categories,
          },
          this.model.$lookups.cryptocurrencies,
          this.model.$lookups.categories,
          this.model.$lookups.author,
          this.model.$lookups.team,
          this.model.$lookups.products,
          this.model.$lookups.projects,
          this.model.$lookups.country,
          this.model.$sets.author,
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
      if (isNil(item)) throwErr(this.error('NOT_FOUND'));
      this.logger.debug('get_success', { item });
      return _permission == 'private' ? toOutPut({ item }) : omit(toOutPut({ item }), PRIVATE_KEYS);
    } catch (err) {
      this.logger.error('get_error', err.message);
      throw err;
    }
  }
  /**
   * Get Company by slug
   * @param id - Company ID
   * @returns { Promise<BaseServiceOutput> } - Company
   */
  async getBySlug({ _slug, _filter, _permission = 'public' }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { lang } = _filter;
      const [item] = await this.model
        .get([
          {
            $match: {
              ...$toMongoFilter({ slug: _slug }),
              ...(lang && {
                'trans.lang': { $eq: lang },
              }),
            },
          },
          {
            $addFields: {
              categories: this.model.$addFields.categories,
              products: this.model.$addFields.products,
              projects: this.model.$addFields.projects,
            },
          },
          this.model.$lookups.cryptocurrencies,
          this.model.$lookups.categories,
          this.model.$lookups.author,
          this.model.$lookups.team,
          // this.model.$lookups.products,
          this.model.$lookups.projects,
          this.model.$lookups.country,
          this.model.$sets.author,
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
      if (isNil(item)) throwErr(this.error('NOT_FOUND'));
      this.logger.debug('get_success', { item });
      return _permission == 'private' ? toOutPut({ item }) : omit(toOutPut({ item }), PRIVATE_KEYS);
    } catch (err) {
      this.logger.error('get_error', err.message);
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
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model
        .get([
          ...$pagination({
            $match: {
              deleted: false,
              ...(q && {
                $or: [
                  { $text: { $search: q } },
                  {
                    name: { $regex: q, $options: 'i' },
                  },
                ],
              }),
              ...(lang && {
                'trans.lang': { $eq: lang },
              }),
            },
            $addFields: this.model.$addFields.categories,
            $lookups: [this.model.$lookups.categories],
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
}
