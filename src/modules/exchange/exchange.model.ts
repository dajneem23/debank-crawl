import { Service, Token } from 'typedi';
import { Exchange } from './exchange.type';
import { keys } from 'ts-transformer-keys';
import { BaseModel } from '../base/base.model';

const COLLECTION_NAME = 'exchanges';
const TOKEN_NAME = '_exchangeModel';
export const exchangeModelToken = new Token<ExchangeModel>(TOKEN_NAME);
@Service(exchangeModelToken)
export class ExchangeModel extends BaseModel {
  constructor() {
    super({
      collectionName: COLLECTION_NAME,
      _keys: keys<Exchange>(),
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
