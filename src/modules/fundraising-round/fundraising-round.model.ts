import { Service, Token } from 'typedi';
import { keys } from 'ts-transformer-keys';
import { BaseModel } from '../base/base.model';
import { FundraisingRound } from './fundraising-round.type';

const COLLECTION_NAME = 'fundraising-rounds';
const TOKEN_NAME = '_fundraisingRoundModel';
export const fundraisingRoundModelToken = new Token<FundraisingRoundModel>(TOKEN_NAME);
@Service(fundraisingRoundModelToken)
export class FundraisingRoundModel extends BaseModel {
  constructor() {
    super({
      collectionName: COLLECTION_NAME,
      _keys: keys<FundraisingRound>(),
      indexes: [
        {
          field: {
            name: 1,
          },
          options: {
            unique: false,
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
            unique: false,
          },
        },
      ],
    });
  }
}
