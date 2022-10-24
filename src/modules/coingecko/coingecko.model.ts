import { Service, Token } from 'typedi';
import { BaseModel } from '../base/base.model';
import { keys } from 'ts-transformer-keys';
import { CoinGeckoAsset, CoinGeckoBlockchains, CoinGeckoCategories } from './coingecko.type';

export const coinGeckoAssetModelToken = new Token<CoinGeckoAssetModel>('_coinGeckoAssetModel');
/**
 * @class AssetModel
 * @extends BaseModel
 * @description Asset model: Asset model for all asset related operations
 */
@Service(coinGeckoAssetModelToken)
export class CoinGeckoAssetModel extends BaseModel {
  constructor() {
    super({
      collectionName: 'coingecko-assets',
      _keys: keys<CoinGeckoAsset>(),
      indexes: [],
    });
  }
}
export const coinGeckoCategoriesModelToken = new Token<CoinGeckoCategoriesModel>('_coinGeckoCategoriesModel');
/**
 * @class AssetModel
 * @extends BaseModel
 * @description Asset model: Asset model for all asset related operations
 */
@Service(coinGeckoCategoriesModelToken)
export class CoinGeckoCategoriesModel extends BaseModel {
  constructor() {
    super({
      collectionName: 'coingecko-categories',
      _keys: keys<CoinGeckoCategories>(),
      indexes: [],
    });
  }
}
export const coinGeckoBlockchainsModelToken = new Token<CoinGeckoBlockchainsModel>('_coinGeckoBlockchainsModel');
/**
 * @class AssetModel
 * @extends BaseModel
 * @description Asset model: Asset model for all asset related operations
 */
@Service(coinGeckoBlockchainsModelToken)
export class CoinGeckoBlockchainsModel extends BaseModel {
  constructor() {
    super({
      collectionName: 'coingecko-blockchains',
      _keys: keys<CoinGeckoBlockchains>(),
      indexes: [],
    });
  }
}
