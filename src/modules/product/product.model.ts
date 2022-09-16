import { Service, Token } from 'typedi';
import { Product } from './product.type';
import { keys } from 'ts-transformer-keys';
import { BaseModel } from '../base/base.model';

const COLLECTION_NAME = 'products';
const TOKEN_NAME = '_productModel';
export const productModelToken = new Token<ProductModel>(TOKEN_NAME);
/**
 * @class ProductModel
 * @extends BaseModel
 * @description Product model: Product model for all product related operations
 **/
@Service(productModelToken)
export class ProductModel extends BaseModel {
  constructor() {
    super({
      collectionName: COLLECTION_NAME,
      _keys: keys<Product>(),
      indexes: [
        {
          field: {
            name: 1,
          },
        },
        {
          field: {
            name: 'text',
          },
        },
      ],
    });
  }
}
