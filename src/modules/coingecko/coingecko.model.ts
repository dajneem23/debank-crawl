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
      _keys: [],
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
      _keys: [],
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
      _keys: [],
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
      _keys: [],
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
      _keys: [],
      indexes: [],
    });
  }
}

export const coinGeckoCoinPricesModelToken = new Token<coinGeckoCoinPricesModel>('_coinGeckoCoinPricesModel');

/**
 * @class CoinGeckoCoinHistoryPModel
 * @extends BaseModel
 * @description Asset model: Asset model for all asset related operations
 *
 */
@Service(coinGeckoCoinPricesModelToken)
export class coinGeckoCoinPricesModel extends BaseModel {
  constructor() {
    super({
      collectionName: 'coingecko-coin-prices',
      _keys: [],
      indexes: [],
    });
  }
}
