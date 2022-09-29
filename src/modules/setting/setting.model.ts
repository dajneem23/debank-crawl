import { keys } from 'ts-transformer-keys';
import { Service, Token } from 'typedi';
import { BaseModel } from '../base/base.model';
import { Setting } from './setting.type';

const COLLECTION_NAME = 'settings';
export const settingModelToken = new Token<SettingModel>('_settingModel');
/**
 * @class SettingModel
 * @description Setting model: Setting model for all setting related operations
 * @extends BaseModel
 */
@Service(settingModelToken)
export class SettingModel extends BaseModel {
  constructor() {
    super({
      collectionName: COLLECTION_NAME,
      _keys: keys<Setting>(),
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
