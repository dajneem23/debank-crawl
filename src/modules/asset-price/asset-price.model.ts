import { Service, Token } from 'typedi';
import { BaseModel } from '../base/base.model';
import { keys } from 'ts-transformer-keys';
import { AssetPrice } from './asset-price.type';

const COLLECTION_NAME = 'asset-price';
const TOKEN_NAME = '_assetModel';
export const assetPriceModelToken = new Token<AssetPriceModel>(TOKEN_NAME);
/**
 * @class AssetModel
 * @extends BaseModel
 * @description Asset model: Asset model for all asset related operations
 */
@Service(assetPriceModelToken)
export class AssetPriceModel extends BaseModel {
  constructor() {
    super({
      collectionName: COLLECTION_NAME,
      _keys: keys<AssetPrice>(),
      indexes: [
        {
          field: {
            name: 1,
          },
          options: {
            unique: true,
          },
        },
        {
          field: {
            name: 'text',
          },
        },
        {
          field: {
            symbol: 1,
          },
        },
        {
          field: {
            slug: 1,
          },
          options: {
            unique: true,
          },
        },
      ],
    });
  }
}
