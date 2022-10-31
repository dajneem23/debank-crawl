import Container, { Service, Token } from 'typedi';
import Logger from '@/core/logger';
import { throwErr, toOutPut, toPagingOutput } from '@/utils/common';
import { $pagination, $toMongoFilter, $keysToProject } from '@/utils/mongoDB';
import { FundraisingRoundError, fundraisingRoundErrors, fundraisingRoundModelToken } from '.';
import { BaseServiceInput, BaseServiceOutput, PRIVATE_KEYS } from '@/types/Common';
import { isNil, omit } from 'lodash';
const TOKEN_NAME = '_fundraisingRoundService';
/**
 * A bridge allows another service access to the Model layer
 * @export FundraisingRoundService
 * @class FundraisingRoundService
 * @extends {BaseService}
 */
export const FundraisingRoundServiceToken = new Token<FundraisingRoundService>(TOKEN_NAME);
/**
 * @class FundraisingRoundService
 * @description FundraisingRound service: FundraisingRound service for all fundraisingRound related operations
 * @extends BaseService
 */
@Service(FundraisingRoundServiceToken)
export class FundraisingRoundService {
  private logger = new Logger('FundraisingRounds');

  readonly model = Container.get(fundraisingRoundModelToken);

  private error(msg: keyof typeof fundraisingRoundErrors) {
    return new FundraisingRoundError(msg);
  }

  get outputKeys(): typeof this.model._keys {
    return this.model._keys;
  }

  get publicOutputKeys() {
    return ['id', 'name', 'avatar', 'description', 'slug', 'short_description'];
  }

  get transKeys() {
    return ['description', 'short_description'];
  }

  /**
   * Create new FundraisingRound
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
   * Update
   * @param _id
   * @param _content
   * @param _subject
   * @returns {Promise<FundraisingRound>}
   */
  async update({ _id, _content, _subject }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { categories = [] } = _content;
      await this.model.update(
        {
          _id,
        },
        {
          $set: {
            ..._content,
            categories,
            ...(_subject && { update_by: _subject }),
          },
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
          ...(_subject && { update_by: _subject }),
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
  async query({ _filter, _query, _permission = 'public' }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { lang, categories = [], deleted = false } = _filter;
      const { offset = 1, limit, sort_by, sort_order, keyword } = _query;
      const [{ paging: [{ total_count = 0 } = {}] = [{ total_count: 0 }], items }] = await this.model
        .get(
          $pagination({
            $match: {
              $and: [
                {
                  ...((_permission === 'private' && {
                    deleted,
                  }) || {
                    deleted: { $ne: true },
                  }),
                  ...(lang && {
                    'trans.lang': { $eq: lang },
                  }),
                },
              ],
              ...(keyword && {
                name: { $regex: keyword, $options: 'i' },
              }),
              ...(categories.length && {
                $or: [{ categories: { $in: categories } }],
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
        )
        .toArray();
      this.logger.debug('query_success', { total_count, items });
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
  /**
   * Get by ID
   * @param id - ID
   * @param _filter - filter query
   * @param _permission - permission query
   * @returns { Promise<BaseServiceOutput> } - product
   */
  async getById({ _id, _filter, _permission = 'public' }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { lang } = _filter;
      const [item] = await this.model
        .get([
          { $match: $toMongoFilter({ _id }) },
          {
            $addFields: this.model.$addFields.categories,
          },
          this.model.$lookups.categories,
          this.model.$lookups.author,
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
   * Get by slug
   * @param _slug - slug
   * @param _filter - filter query
   * @param _permission - permission query
   * @returns { Promise<BaseServiceOutput> } - product
   */
  async getBySlug({ _slug, _filter, _permission = 'public' }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { lang } = _filter;
      const [item] = await this.model
        .get([
          { $match: $toMongoFilter({ slug: _slug }) },
          {
            $addFields: this.model.$addFields.categories,
          },
          this.model.$lookups.categories,
          this.model.$lookups.author,
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
      const { lang } = _filter;
      const { offset = 1, limit = 10, sort_by, sort_order, keyword } = _query;
      const [{ paging: [{ total_count = 0 } = {}] = [{ total_count: 0 }], items }] = await this.model
        .get([
          ...$pagination({
            $match: {
              deleted: { $ne: true },
              ...(keyword && {
                $or: [{ $text: { $search: keyword } }, { name: { $regex: keyword, $options: 'i' } }],
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
      this.logger.debug('query_success', { total_count, items });
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
