import { keys } from 'ts-transformer-keys';
import { Service, Token } from 'typedi';
import { BaseModel } from '../base/base.model';
import { Setting } from './setting.type';

const COLLECTION_NAME = 'categories';
export const settingModelToken = new Token<SettingModel>('_settingModel');
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
