import { Service, Token } from 'typedi';
import { keys } from 'ts-transformer-keys';
import { BaseModel } from '../base/base.model';
import { Glossary } from './glossary.type';

const COLLECTION_NAME = 'glossaries';
const TOKEN_NAME = '_glossaryModel';
export const glossaryModelToken = new Token<GlossaryModel>(TOKEN_NAME);
@Service(glossaryModelToken)
export class GlossaryModel extends BaseModel {
  constructor() {
    super({
      collectionName: COLLECTION_NAME,
      _keys: keys<Glossary>(),
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
