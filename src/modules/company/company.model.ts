import { Db } from 'mongodb';
import { Inject, Service, Token } from 'typedi';
import { Company } from './company.type';
import { keys } from 'ts-transformer-keys';
import { BaseModel } from '../base/base.model';

const COLLECTION_NAME = 'companies';
const TOKEN_NAME = '_companyModel';
export const companyModelToken = new Token<CompanyModel>(TOKEN_NAME);
@Service(companyModelToken)
export class CompanyModel extends BaseModel {
  constructor() {
    super({
      collectionName: COLLECTION_NAME,
      _keys: keys<Company>(),
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
