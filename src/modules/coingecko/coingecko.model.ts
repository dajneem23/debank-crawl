import { Service, Token } from 'typedi';
import { BaseModel } from '../base/base.model';
import { keys } from 'ts-transformer-keys';
import {
  CoinGeckoAsset,
  CoinGeckoBlockchain,
  CoinGeckoCategories,
  CoinGeckoCryptoCurrencyGlobal,
  CoinGeckoExchange,
} from './coingecko.type';

export const coinGeckoAssetModelToken = new Token<CoinGeckoAssetModel>('_coinGeckoAssetModel');
/**
 * @class CoinGeckoAssetModel
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
 * @class CoinGeckoCategoriesModel
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
export const coinGeckoBlockchainModelToken = new Token<CoinGeckoBlockchainModel>('_coinGeckoBlockchainModel');
/**
 * @class CoinGeckoBlockchainModel
 * @extends BaseModel
 * @description Asset model: Asset model for all asset related operations
 */
@Service(coinGeckoBlockchainModelToken)
export class CoinGeckoBlockchainModel extends BaseModel {
  constructor() {
    super({
      collectionName: 'coingecko-blockchains',
      _keys: keys<CoinGeckoBlockchain>(),
      indexes: [],
    });
  }
}

export const coinGeckoExchangeModelToken = new Token<CoinGeckoExchangeModel>('_coinGeckoExchangeModel');
/**
 * @class CoinGeckoExchangesModel
 * @extends BaseModel
 * @description Asset model: Asset model for all asset related operations
 */
@Service(coinGeckoExchangeModelToken)
export class CoinGeckoExchangeModel extends BaseModel {
  constructor() {
    super({
      collectionName: 'coingecko-exchanges',
      _keys: keys<CoinGeckoExchange>(),
      indexes: [],
    });
  }
}
export const coinGeckoCryptoCurrencyGlobalModelToken = new Token<CoinGeckoCryptoCurrencyGlobalModel>(
  '_coinGeckoCryptoCurrencyGlobalModel',
);
/**
 * @class CoinGeckoCryptoCurrencyGlobalsModel
 * @extends BaseModel
 * @description Asset model: Asset model for all asset related operations
 */
@Service(coinGeckoCryptoCurrencyGlobalModelToken)
export class CoinGeckoCryptoCurrencyGlobalModel extends BaseModel {
  constructor() {
    super({
      collectionName: 'coingecko-crypto-currency-global',
      _keys: keys<CoinGeckoCryptoCurrencyGlobal>(),
      indexes: [],
    });
  }
}
