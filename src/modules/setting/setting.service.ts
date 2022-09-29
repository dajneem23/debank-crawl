import Container, { Service, Token } from 'typedi';
import Logger from '@/core/logger';
import { toOutPut, toPagingOutput } from '@/utils/common';
import { alphabetSize12 } from '@/utils/randomString';

import { $pagination, $toMongoFilter } from '@/utils/mongoDB';
import { BaseServiceInput, BaseServiceOutput, PRIVATE_KEYS } from '@/types/Common';
import { isNil, omit } from 'lodash';
import { settingModelToken } from '.';

const TOKEN_NAME = '_settingService';
/**
 * A bridge allows another service access to the Model layer
 * @export SettingService
 * @class SettingService
 * @extends {BaseService}
 */
export const settingServiceToken = new Token<SettingService>(TOKEN_NAME);
/**
 * @class SettingService
 * @description Setting service: Setting service for all setting related operations
 * @extends BaseService
 */
@Service(settingServiceToken)
export class SettingService {
  private logger = new Logger('Settings');

  private model = Container.get(settingModelToken);

  get outputKeys() {
    return this.model._keys;
  }

  get publicOutputKeys() {
    return ['id', 'name', 'content', 'weight'];
  }

  /**
   * Generate ID
   */
  static async generateID() {
    return alphabetSize12();
  }

  /**
   * Create a new setting
   * @param _content
   * @param subject
   * @returns {Promise<Setting>}
   */
  async create({ _content, _subject }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const value = await this.model.create(
        { name: _content.name },
        {
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
   * Update setting
   * @param _id
   * @param _content
   * @param _subject
   * @returns {Promise<Setting>}
   */
  async update({ _id, _content, _subject }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
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
   * Delete setting
   * @param _id
   * @param {ObjectId} _subject
   * @returns {Promise<Setting>}
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
   *  Query setting
   * @param {any} _filter
   * @param {BaseQuery} _query
   * @returns {Promise<BaseServiceOutput>}
   *
   **/
  async query({ _filter, _query }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { type, q } = _filter;
      const { page = 1, per_page, sort_by, sort_order } = _query;
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model
        .get(
          $pagination({
            $match: {
              ...(type && {
                type: { $in: Array.isArray(type) ? type : [type] },
              }),
              ...(q && {
                name: { $regex: q, $options: 'i' },
              }),
            },
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
   * Get Setting by ID
   * @param _id - Setting ID
   * @returns { Promise<BaseServiceOutput> } - Setting
   */
  async getById({ _id }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const [item] = await this.model
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
      if (isNil(item)) this.model.error('common.not_found');
      this.logger.debug('get_success', { item });
      return omit(toOutPut({ item }), ['deleted', 'updated_at']);
    } catch (err) {
      this.logger.error('get_error', err.message);
      throw err;
    }
  }
  /**
   * Get Setting by name
   * @param _id - Setting ID
   * @returns { Promise<BaseServiceOutput> } - Setting
   */
  async getByName({ _name, _filter, _permission }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { type } = _filter;
      const [setting] = await this.model
        .get([
          {
            $match: $toMongoFilter({
              name: { $regex: _name, $options: 'i' },
              ...((type && type) || {}),
            }),
          },
          {
            $limit: 1,
          },
        ])
        .toArray();
      if (isNil(setting)) this.model.error('common.not_found');
      this.logger.debug('get_success', { setting });
      return _permission == 'private' ? toOutPut({ item: setting }) : omit(toOutPut({ item: setting }), PRIVATE_KEYS);
    } catch (err) {
      this.logger.error('get_error', err.message);
      throw err;
    }
  }
  /**
   *  Search setting
   * @param {any} _filter
   * @param {BaseQuery} _query
   * @returns {Promise<BaseServiceOutput>}
   */
  async search({ _filter, _query }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { q, type } = _filter;
      const { page = 1, per_page = 10 } = _query;
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model
        .get([
          ...$pagination({
            $match: {
              ...(type && {
                type: { $in: Array.isArray(type) ? type : [type] },
              }),
              ...(q && {
                $or: [{ $text: { $search: q } }, { name: { $regex: q, $options: 'i' } }],
              }),
            },
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
