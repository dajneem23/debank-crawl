import Container, { Inject, Service, Token } from 'typedi';
import Logger from '@/core/logger';
import { toOutPut, toPagingOutput } from '@/utils/common';
import AuthSessionModel from '@/modules/auth/authSession.model';
import AuthService from '../auth/auth.service';
import { $pagination, $toMongoFilter, $keysToProject, $lookup, $sets, $toObjectId } from '@/utils/mongoDB';
import { assetPriceModelToken } from '.';
import { assetSortBy, BaseServiceInput, BaseServiceOutput } from '@/types/Common';
import { isNil, uniq } from 'lodash';
import { coinGeckoAssetServiceToken } from '../coingecko-asset';
const TOKEN_NAME = '_assetPriceService';
/**
 * A bridge allows another service access to the Model layer
 * @export AssetPriceService
 * @class AssetPriceService
 * @extends {BaseService}
 */
export const AssetPriceServiceToken = new Token<AssetPriceService>(TOKEN_NAME);
/**
 * @class AssetPriceService
 * @extends BaseService
 * @description AssetPrice Service for all assetPrice related operations
 */
@Service(AssetPriceServiceToken)
export class AssetPriceService {
  private logger = new Logger('AssetPriceService');

  private model = Container.get(assetPriceModelToken);

  @Inject()
  private authSessionModel: AuthSessionModel;

  @Inject()
  private authService: AuthService;

  get outputKeys(): typeof this.model._keys {
    return this.model._keys;
  }
  get assetKeys() {
    return ['_id', 'avatar', 'categories', 'rating', 'founded', 'backer', 'community_vote', 'technologies'];
  }

  /**
   * Create a new assetPrice
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
   * Update assetPrice
   * @param _id
   * @param _content
   * @param _subject
   * @returns {Promise<AssetPrice>}
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
   * Delete assetPrice
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
   *  Query assetPrice
   * @param {any} _filter
   * @param {BaseQuery} _query
   * @returns {Promise<BaseServiceOutput>}
   *
   **/
  async query({ _filter, _query, _permission = 'public' }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const {
        categories = [],
        deleted = false,
        community_vote_min,
        community_vote_max,
        market_cap_min,
        market_cap_max,
        fully_diluted_market_cap_min,
        fully_diluted_market_cap_max,
        backer,
        development_status,
        founded_from,
        founded_to,
      } = _filter;
      const { offset = 1, limit, sort_by: _sort_by, sort_order, keyword } = _query;
      const sort_by = assetSortBy[_sort_by as keyof typeof assetSortBy] || assetSortBy['created_at'];
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model
        .get(
          $pagination({
            $match: {
              ...((_permission === 'private' && {
                deleted,
              }) || {
                deleted: false,
              }),
              ...(keyword && {
                name: { $regex: keyword, $options: 'i' },
              }),
              ...(!isNil(market_cap_min) && {
                'market_data.USD.market_cap': {
                  $gte: market_cap_min,
                },
              }),
              ...(!isNil(market_cap_max) && {
                'market_data.USD.market_cap': {
                  $lte: market_cap_max,
                },
              }),

              ...(!isNil(fully_diluted_market_cap_max) && {
                'market_data.USD.fully_diluted_market_cap': {
                  $lte: fully_diluted_market_cap_max,
                },
              }),
              ...(!isNil(fully_diluted_market_cap_min) && {
                'market_data.USD.fully_diluted_market_cap': {
                  $gte: fully_diluted_market_cap_min,
                },
              }),
            },
            $lookups: [
              $lookup({
                from: 'assets',
                refFrom: 'slug',
                refTo: 'slug',
                select: this.assetKeys.join(' '),
                reName: '_asset',
                operation: '$eq',
              }),
            ],
            $more: [
              {
                $project: {
                  ...$keysToProject(this.outputKeys),
                  ...$keysToProject(this.assetKeys, '$_asset'),
                },
              },
              {
                $set: {
                  ...$sets(this.assetKeys),
                },
              },
              {
                $match: {
                  ...((categories.length && {
                    categories: {
                      $in: $toObjectId(categories),
                    },
                  }) ||
                    {}),

                  ...((!isNil(community_vote_max) && {
                    community_vote: {
                      $lte: community_vote_max,
                    },
                  }) ||
                    {}),
                  ...((!isNil(community_vote_min) && {
                    community_vote: {
                      $gte: community_vote_min,
                    },
                  }) ||
                    {}),

                  ...((!isNil(founded_from) && {
                    founded: {
                      $gte: founded_from,
                    },
                  }) ||
                    {}),
                  ...((!isNil(founded_to) && {
                    founded: {
                      $lte: founded_to,
                    },
                  }) ||
                    {}),

                  ...((backer && {
                    backer: { $eq: backer },
                  }) ||
                    {}),

                  ...((development_status && {
                    'technologies.development_status': { $eq: development_status },
                  }) ||
                    {}),
                },
              },

              {
                $addFields: this.model.$addFields.categories,
              },
              {
                ...this.model.$lookups.categories,
              },
            ],
            ...(sort_by && sort_order && { $sort: { [sort_by]: sort_order == 'asc' ? 1 : -1 } }),
            ...(limit && offset && { items: [{ $skip: +limit * (+offset - 1) }, { $limit: +limit }] }),
          }),
        )
        .toArray();
      this.logger.debug('query_success', { total_count, items });
      return toPagingOutput({
        items,
        total_count,
        has_next: total_count > offset * limit,
        keys: uniq([...this.outputKeys, ...this.assetKeys]),
      });
    } catch (err) {
      this.logger.error('query_error', err.message);
      throw err;
    }
  }
}
