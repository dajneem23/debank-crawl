import { Db } from 'mongodb';
import { Inject, Service } from 'typedi';
import { DIMongoDB } from '@/loaders/mongoDBLoader';
import { DILogger } from '@/loaders/loggerLoader';
import Logger from '@/core/logger';
import { Fund } from './fund.type';
import { BaseModel } from '../base/base.model';
@Service('_fundModel')
export class FundModel extends BaseModel {
  constructor() {
    super({
      collectionName: 'funds',
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
