import Container, { Inject, Service, Token } from 'typedi';
import Logger from '@/core/logger';
import { toOutPut, toPagingOutput } from '@/utils/common';
import AuthSessionModel from '@/modules/auth/authSession.model';
import AuthService from '../auth/auth.service';
import { $pagination, $toMongoFilter, $keysToProject, $lookup, $sets } from '@/utils/mongoDB';
import { assetPriceModelToken } from '.';
import { BaseServiceInput, BaseServiceOutput } from '@/types/Common';
import { uniq } from 'lodash';
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
    return ['_id', 'avatar', 'rating', 'founded', 'backer', 'community_vote', 'categories'];
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
      const { categories = [], deleted = false } = _filter;
      const { offset = 1, limit, sort_by, sort_order, keyword } = _query;
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
              // ...(categories.length && {
              //   $or: [
              //     {
              //       categories: {
              //         $in: $toObjectId(categories),
              //       },
              //     },
              //   ],
              // }),
            },
            $addFields: this.model.$addFields.categories,
            $lookups: [
              this.model.$lookups.categories,
              $lookup({
                from: 'assets',
                refFrom: 'slug',
                refTo: 'slug',
                select: this.assetKeys.join(' '),
                reName: '_asset',
                operation: '$eq',
                lookup: this.model.$lookups.categories,
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
