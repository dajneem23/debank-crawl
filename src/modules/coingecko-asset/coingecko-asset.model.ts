import { Service, Token } from 'typedi';
import { BaseModel } from '../base/base.model';
import { keys } from 'ts-transformer-keys';
import { CoinGeckoAsset } from './coingecko-asset.type';

const COLLECTION_NAME = 'coingecko-assets';
const TOKEN_NAME = '_coinGeckoAssetModel';
export const coinGeckoAssetModelToken = new Token<CoinGeckoAssetModel>(TOKEN_NAME);
/**
 * @class AssetModel
 * @extends BaseModel
 * @description Asset model: Asset model for all asset related operations
 */
@Service(coinGeckoAssetModelToken)
export class CoinGeckoAssetModel extends BaseModel {
  constructor() {
    super({
      collectionName: COLLECTION_NAME,
      _keys: keys<CoinGeckoAsset>(),
      indexes: [],
    });
  }
}
