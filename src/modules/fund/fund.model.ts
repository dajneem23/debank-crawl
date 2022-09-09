import { Service } from 'typedi';
import { BaseModel } from '../base/base.model';
import { Fund } from './fund.type';
import { keys } from 'ts-transformer-keys';

/**
 * @class FundModel
 * @extends BaseModel
 * @description Fund model: Fund model for all fund related operations
 */
@Service('_fundModel')
export class FundModel extends BaseModel {
  constructor() {
    super({
      collectionName: 'funds',
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
