import { Service, Token } from 'typedi';
import { Blockchain } from './blockchain.type';
import { keys } from 'ts-transformer-keys';
import { BaseModel } from '../base/base.model';

const COLLECTION_NAME = 'blockchains';
const TOKEN_NAME = '_blockchainModel';
export const blockchainModelToken = new Token<BlockchainModel>(TOKEN_NAME);
@Service(blockchainModelToken)
export class BlockchainModel extends BaseModel {
  constructor() {
    super({
      collectionName: COLLECTION_NAME,
      _keys: keys<Blockchain>(),
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
