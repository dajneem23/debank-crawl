import { Service, Token } from 'typedi';
import { Person } from './person.type';
import { BaseModel } from '../base/base.model';
import { keys } from 'ts-transformer-keys';
const COLLECTION_NAME = 'persons';
const TOKEN_NAME = '_personModel';
export const personModelToken = new Token<PersonModel>(TOKEN_NAME);
/**
 * @class PersonModel
 * @description Person model: Person model for all person related operations
 * @extends BaseModel
 */
@Service(personModelToken)
export class PersonModel extends BaseModel {
  constructor() {
    super({
      collectionName: COLLECTION_NAME,
      _keys: keys<Person>(),
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
        {
          field: {
            slug: 1,
          },
        },
      ],
    });
  }
}
