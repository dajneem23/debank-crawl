import Container, { Service, Token } from 'typedi';
import Logger from '@/core/logger';
import { assetPriceModelToken } from '.';
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

  readonly model = Container.get(assetPriceModelToken);

  get outputKeys(): typeof this.model._keys {
    return this.model._keys;
  }
  get assetKeys() {
    return ['_id', 'avatar', 'categories', 'rating', 'founded', 'backer', 'community_vote', 'technologies'];
  }
}
