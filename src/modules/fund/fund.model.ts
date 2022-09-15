import { Service, Token } from 'typedi';
import { BaseModel } from '../base/base.model';
import { Fund } from './fund.type';
import { keys } from 'ts-transformer-keys';
const COLLECTION_NAME = 'funds';
const newLocal = '_fundModel';
export const fundModelToken = new Token<FundModel>(newLocal);

/**
 * @class FundModel
 * @extends BaseModel
 * @description Fund model: Fund model for all fund related operations
 */
@Service(fundModelToken)
export class FundModel extends BaseModel {
  constructor() {
    super({
      collectionName: COLLECTION_NAME,
      _keys: keys<Fund>(),
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
