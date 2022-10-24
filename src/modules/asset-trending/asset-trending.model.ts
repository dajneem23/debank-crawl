import { Service, Token } from 'typedi';
import { BaseModel } from '../base/base.model';
import { keys } from 'ts-transformer-keys';
import { AssetTrending } from './asset-trending.type';

const COLLECTION_NAME = 'asset-trending';
const TOKEN_NAME = '_assetTrendingModel';
export const assetTrendingModelToken = new Token<AssetTrendingModel>(TOKEN_NAME);
/**
 * @class AssetModel
 * @extends BaseModel
 * @description Asset model: Asset model for all asset related operations
 */
@Service(assetTrendingModelToken)
export class AssetTrendingModel extends BaseModel {
  constructor() {
    super({
      collectionName: COLLECTION_NAME,
      _keys: keys<AssetTrending>(),
      indexes: [],
    });
  }
}
