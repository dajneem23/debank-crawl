import Container, { Inject, Service, Token } from 'typedi';
import Logger from '@/core/logger';
import { toOutPut, toPagingOutput } from '@/utils/common';
import AuthSessionModel from '@/modules/auth/authSession.model';
import AuthService from '../auth/auth.service';
import { $pagination, $toMongoFilter } from '@/utils/mongoDB';
import { assetTrendingModelToken } from '.';
import { assetSortBy, BaseServiceInput, BaseServiceOutput } from '@/types/Common';
import { uniq } from 'lodash';
const TOKEN_NAME = '_assetTrendingService';
/**
 * A bridge allows another service access to the Model layer
 * @export AssetTrendingService
 * @class AssetTrendingService
 * @extends {BaseService}
 */
export const assetTrendingServiceToken = new Token<AssetTrendingService>(TOKEN_NAME);
/**
 * @class AssetTrendingService
 * @extends BaseService
 * @description AssetTrending Service for all assetTrending related operations
 */
@Service(assetTrendingServiceToken)
export class AssetTrendingService {
  private logger = new Logger('AssetTrendingService');

  private model = Container.get(assetTrendingModelToken);

  @Inject()
  private authSessionModel: AuthSessionModel;

  @Inject()
  private authService: AuthService;

  get outputKeys(): typeof this.model._keys {
    return this.model._keys;
  }

  /**
   * Create a new assetTrending
   * @param {BaseServiceInput} - _content _subject
   * @returns {Promise<BaseServiceOutput>}
   */
  async create({ _content, _subject }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { name } = _content;
      const value = await this.model.create(
        {
          name,
        },
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
   * Update assetTrending
   * @param _id
   * @param _content
   * @param _subject
   * @returns {Promise<AssetTrending>}
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
   * Delete assetTrending
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
   *  Query assetTrending
   * @param {any} _filter
   * @param {BaseQuery} _query
   * @returns {Promise<BaseServiceOutput>}
   *
   **/
  async trending({ _filter, _query, _permission = 'public' }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { categories = [], deleted = false } = _filter;
      const { offset = 1, limit, sort_by: _sort_by, sort_order, keyword } = _query;
      const sort_by = assetSortBy[_sort_by as keyof typeof assetSortBy] || assetSortBy['created_at'];
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model
        .get([
          {
            $match: {
              type: 'trending',
            },
          },
          {
            $unwind: '$tokens',
          },
          {
            $lookup: {
              from: 'assets',
              localField: 'id_of_sources.CoinGecko',
              foreignField: 'id_of_sources.CoinGecko',
              as: 'assets',
            },
          },
          {
            $set: {
              asset: {
                $first: '$assets',
              },
            },
          },
          {
            $replaceRoot: {
              newRoot: '$asset',
            },
          },
        ])
        .toArray();
      this.logger.debug('query_success', { total_count, items });
      return toPagingOutput({
        items,
        total_count,
        has_next: total_count > offset * limit,
        // keys: uniq([...this.outputKeys]),
      });
    } catch (err) {
      this.logger.error('query_error', err.message);
      throw err;
    }
  }
  /**
   *  Query assetTrending
   * @param {any} _filter
   * @param {BaseQuery} _query
   * @returns {Promise<BaseServiceOutput>}
   *
   **/
  async trendingSoon({ _filter, _query, _permission = 'public' }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { categories = [], deleted = false } = _filter;
      const { offset = 1, limit, sort_by: _sort_by, sort_order, keyword } = _query;
      const sort_by = assetSortBy[_sort_by as keyof typeof assetSortBy] || assetSortBy['created_at'];
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model
        .get([
          {
            $match: {
              type: 'trending-soon',
            },
          },
          {
            $unwind: '$tokens',
          },
          {
            $lookup: {
              from: 'assets',
              localField: 'id_of_sources.CoinGecko',
              foreignField: 'id_of_sources.CoinGecko',
              as: 'assets',
            },
          },
          {
            $set: {
              asset: {
                $first: '$assets',
              },
            },
          },
          {
            $replaceRoot: {
              newRoot: '$asset',
            },
          },
        ])
        .toArray();
      this.logger.debug('query_success', { total_count, items });
      return toPagingOutput({
        items,
        total_count,
        has_next: total_count > offset * limit,
        // keys: uniq([...this.outputKeys]),
      });
    } catch (err) {
      this.logger.error('query_error', err.message);
      throw err;
    }
  }
}
