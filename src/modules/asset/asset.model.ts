import { Service, Token } from 'typedi';
import { Asset } from './asset.type';
import { BaseModel } from '../base/base.model';
import { keys } from 'ts-transformer-keys';

const COLLECTION_NAME = 'assets';
const TOKEN_NAME = '_assetModel';
export const assetModelToken = new Token<AssetModel>(TOKEN_NAME);
/**
 * @class AssetModel
 * @extends BaseModel
 * @description Asset model: Asset model for all asset related operations
 */
@Service(assetModelToken)
export class AssetModel extends BaseModel {
  constructor() {
    super({
      collectionName: COLLECTION_NAME,
      _keys: keys<Asset>(),
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
