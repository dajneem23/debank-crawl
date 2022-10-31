import Container, { Inject, Service, Token } from 'typedi';
import Logger from '@/core/logger';
import { throwErr, toOutPut, toPagingOutput } from '@/utils/common';
import AuthSessionModel from '@/modules/auth/authSession.model';
import AuthService from '../auth/auth.service';
import { $pagination, $toMongoFilter, $queryByList, $keysToProject } from '@/utils/mongoDB';
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

  readonly model = Container.get(companyModelToken);

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
    return ['id', 'avatar', 'slug', 'categories', 'description', 'short_description', 'name', 'author'];
  }
  get transKeys() {
    return ['description', 'short_description', 'features', 'services'];
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
      this.logger.debug('create_success', JSON.stringify(_content));
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
      await this.model.update($toMongoFilter({ _id }), {
        $set: {
          ..._content,
          ...(_subject && { updated_by: _subject }),
        },
      });
      this.logger.debug('update_success', JSON.stringify(_content));
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
      const {
        lang,
        categories = [],
        deleted = false,
        funding_min,
        funding_max,
        // launched_from,
        // launched_to,
        type,
        tier,
      } = _filter;
      const { offset, limit, sort_by, sort_order, keyword } = _query;
      const [{ paging: [{ total_count = 0 } = {}] = [{ total_count: 0 }], items }] = await this.model
        .get(
          $pagination({
            $match: {
              ...((_permission === 'private' && {
                deleted,
              }) || {
                deleted: { $ne: true },
              }),
              ...(keyword && {
                name: { $regex: keyword, $options: 'i' },
              }),
              ...(categories.length && {
                $or: [
                  {
                    categories: {
                      $in: categories,
                    },
                  },
                ],
              }),
              ...(lang && {
                'trans.lang': { $eq: lang },
              }),
              ...(funding_min && { funding: { $gte: funding_min } }),
              ...(funding_max && { funding: { $lte: funding_max } }),

              ...(type && {
                type,
              }),
              ...(tier && {
                tier,
              }),
            },
            $addFields: this.model.$addFields.categories,
            $lookups: [this.model.$lookups.categories],
            $projects: [
              ...((lang && [
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
              ]) ||
                []),
            ],
            $more: [
              ...((lang && [this.model.$sets.trans]) || []),
              ...((lang && [
                {
                  $project: {
                    ...$keysToProject(this.outputKeys),
                    ...(lang && $keysToProject(this.transKeys, '$trans')),
                  },
                },
              ]) ||
                []),
            ],
            ...(sort_by && sort_order && { $sort: { [sort_by]: sort_order == 'asc' ? 1 : -1 } }),
            items: [{ $skip: (+offset - 1) * +limit }, { $limit: +limit }],
          }),
          { allowDiskUse: true },
        )
        .toArray();
      this.logger.debug('query_success', { total_count, _filter, _query });
      return toPagingOutput({
        items,
        total_count,
        has_next: total_count > offset + limit,
        keys: _permission == 'private' ? this.outputKeys : this.publicOutputKeys,
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
            $limit: 1,
          },
          {
            $addFields: {
              ...this.model.$addFields.categories,
              ...this.model.$addFields.products,
              ...this.model.$addFields.projects,
              ...this.model.$addFields.cryptocurrencies,
              ...this.model.$addFields.portfolio_companies,
              ...this.model.$addFields.portfolio_funds,
              ...this.model.$addFields.company_investors,
              ...this.model.$addFields.person_investors,
              // ...this.model.$addFields.company_projects,
              ...this.model.$addFields.founders,
            },
          },
          this.model.$lookups.author,
          this.model.$lookups.founders,
          this.model.$lookups.categories,
          this.model.$lookups.cryptocurrencies,
          // this.model.$lookups.company_projects,
          this.model.$lookups.person_investors,
          this.model.$lookups.company_investors,
          this.model.$lookups.portfolio_funds,
          this.model.$lookups.portfolio_companies,
          this.model.$sets.author,
          ...((lang && [
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
          ]) ||
            []),
          ...((lang && [this.model.$sets.trans]) || []),
          ...((lang && [
            {
              $project: {
                ...$keysToProject(this.outputKeys),
                ...(lang && $keysToProject(this.transKeys, '$trans')),
              },
            },
          ]) ||
            []),
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
            $limit: 1,
          },
          {
            $addFields: {
              ...this.model.$addFields.categories,
              ...this.model.$addFields.products,
              ...this.model.$addFields.projects,
              ...this.model.$addFields.cryptocurrencies,
              ...this.model.$addFields.portfolio_companies,
              ...this.model.$addFields.portfolio_funds,
              ...this.model.$addFields.company_investors,
              ...this.model.$addFields.person_investors,
              // ...this.model.$addFields.company_projects,
              ...this.model.$addFields.founders,
            },
          },
          this.model.$lookups.cryptocurrencies,
          this.model.$lookups.categories,
          this.model.$lookups.author,
          this.model.$lookups.portfolio_companies,
          // this.model.$lookups.company_projects,
          this.model.$lookups.company_investors,
          this.model.$lookups.person_investors,
          this.model.$lookups.portfolio_funds,
          this.model.$lookups.founders,

          this.model.$sets.author,

          ...((lang && [
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
          ]) ||
            []),
          ...((lang && [this.model.$sets.trans]) || []),
          ...((lang && [
            {
              $project: {
                ...$keysToProject(this.outputKeys),
                ...(lang && $keysToProject(this.transKeys, '$trans')),
              },
            },
          ]) ||
            []),
        ])
        .toArray();
      if (isNil(item)) throwErr(this.error('NOT_FOUND'));
      this.logger.debug('get_success', { _slug });
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
      const { lang } = _filter;
      const { offset, limit, sort_by, sort_order, keyword } = _query;
      const [{ paging: [{ total_count = 0 } = {}] = [{ total_count: 0 }], items }] = await this.model
        .get([
          ...$pagination({
            $match: {
              deleted: { $ne: true },
              ...(keyword && {
                $or: [
                  { $text: { $search: keyword } },
                  {
                    name: { $regex: keyword, $options: 'i' },
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
              ...((lang && [
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
              ]) ||
                []),
            ],
            $more: [
              ...((lang && [this.model.$sets.trans]) || []),
              ...((lang && [
                {
                  $project: {
                    ...$keysToProject(this.outputKeys),
                    ...(lang && $keysToProject(this.transKeys, '$trans')),
                  },
                },
              ]) ||
                []),
            ],
            items: [{ $skip: (+offset - 1) * +limit }, { $limit: +limit }],
          }),
        ])
        .toArray();
      this.logger.debug('query_success', { total_count, _query, _filter });
      return toPagingOutput({
        items,
        total_count,
        has_next: total_count > offset + limit,
        keys: this.publicOutputKeys,
      });
    } catch (err) {
      this.logger.error('query_error', err.message);
      throw err;
    }
  }
}
