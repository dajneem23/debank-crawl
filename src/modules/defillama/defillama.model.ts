import { keys } from 'ts-transformer-keys';
import { Service, Token } from 'typedi';
import { BaseModel } from '../base/base.model';
import {
  DefillamaTvlProtocol,
  DefillamaTvlChart,
  DefillamaTvlChain,
  DefillamaStableCoin,
  DefillamaStableCoinPrice,
  DefillamaStableCoinChart,
} from './defillama.type';

export const defillamaTvlProtocolModelToken = new Token<DefillamaTvlProtocolModel>('_defillamaTvlProtocolAssetModel');
/**
 * @class DefillamaTvlProtocolModel
 * @extends BaseModel
 * @description Defillama TVL Protocol Model
 */
@Service(defillamaTvlProtocolModelToken)
export class DefillamaTvlProtocolModel extends BaseModel {
  constructor() {
    super({
      collectionName: 'defillama-tvl-protocols',
      _keys: keys<DefillamaTvlProtocol>(),
      indexes: [],
    });
  }
}
export const defillamaTvlChartModelToken = new Token<DefillamaTvlChartModel>('_defillamaTvlChartModel');
/**
 * @class DefillamaTvlChartModel
 * @extends BaseModel
 * @description DefillamaTvlChart model: DefillamaTvlChart model for all DefillamaTvlChart related operations
 */
@Service(defillamaTvlChartModelToken)
export class DefillamaTvlChartModel extends BaseModel {
  constructor() {
    super({
      collectionName: 'defillama-tvl-charts',
      _keys: keys<DefillamaTvlChart>(),
      indexes: [],
    });
  }
}

export const defillamaTvlChainModelToken = new Token<DefillamaTvlChainsModel>('_defillamaTvlChainsModel');
/**
 * @class DefillamaTvlChainsModel
 * @extends BaseModel
 * @description DefillamaTvlChains model: DefillamaTvlChains model for all DefillamaTvlChains related operations
 */
@Service(defillamaTvlChainModelToken)
export class DefillamaTvlChainsModel extends BaseModel {
  constructor() {
    super({
      collectionName: 'defillama-tvl-chains',
      _keys: keys<DefillamaTvlChain>(),
      indexes: [],
    });
  }
}

export const defillamaStableCoinsModelToken = new Token<DefillamaStableCoinsModel>('_defillamaStableCoinsModel');
/**
 * @class DefillamaStableCoinsModel
 * @extends BaseModel
 * @description DefillamaStableCoinsModel model: DefillamaStableCoinsModel model for all DefillamaStableCoinsModel related operations
 */
@Service(defillamaStableCoinsModelToken)
export class DefillamaStableCoinsModel extends BaseModel {
  constructor() {
    super({
      collectionName: 'defillama-stablecoins',
      _keys: keys<DefillamaStableCoin>(),
      indexes: [],
    });
  }
}
export const defillamaStableCoinPriceModelToken = new Token<DefillamaStableCoinPriceModel>(
  '_defillamaStableCoinPriceModel',
);
/**
 * @class DefillamaStableCoinsModel
 * @extends BaseModel
 * @description DefillamaStableCoinsModel model: DefillamaStableCoinsModel model for all DefillamaStableCoinsModel related operations
 */
@Service(defillamaStableCoinPriceModelToken)
export class DefillamaStableCoinPriceModel extends BaseModel {
  constructor() {
    super({
      collectionName: 'defillama-stablecoin-price',
      _keys: keys<DefillamaStableCoinPrice>(),
      indexes: [],
    });
  }
}

export const defillamaStableCoinChartsModelToken = new Token<DefillamaStableCoinChartsModel>(
  '_defillamaStableCoinChartsModel',
);
/**
 * @class DefillamaStableCoinsModel
 * @extends BaseModel
 * @description DefillamaStableCoinsModel model: DefillamaStableCoinsModel model for all DefillamaStableCoinsModel related operations
 */
@Service(defillamaStableCoinChartsModelToken)
export class DefillamaStableCoinChartsModel extends BaseModel {
  constructor() {
    super({
      collectionName: 'defillama-stablecoin-charts',
      _keys: keys<DefillamaStableCoinChart>(),
      indexes: [],
    });
  }
}
