import { Service, Token } from 'typedi';
import { Category } from '.';
import { keys } from 'ts-transformer-keys';
import { BaseModel } from '../base/base.model';

const COLLECTION_NAME = 'categories';
export const categoryModelToken = new Token<CategoryModel>('_categoryModel');
@Service(categoryModelToken)
export class CategoryModel extends BaseModel {
  constructor() {
    super({
      collectionName: COLLECTION_NAME,
      _keys: keys<Category>(),
      indexes: [
        {
          field: {
            title: 1,
          },
        },
        {
          field: {
            title: 'text',
          },
        },
        {
          field: {
            name: 1,
          },
        },
        {
          field: {
            'trans.lang': 1,
          },
        },
      ],
    });
  }
}
