import { Db } from 'mongodb';
import { Inject, Service, Token } from 'typedi';
import { DIMongoDB } from '@/loaders/mongoDBLoader';
import { DILogger } from '@/loaders/loggerLoader';
import Logger from '@/core/logger';
import { News } from './news.type';
import { BaseModel } from '../base/base.model';
import { keys } from 'ts-transformer-keys';
const COLLECTION_NAME = 'news';
const TOKEN_NAME = '_newsModel';
export const newsModelToken = new Token<NewsModel>(TOKEN_NAME);
/**
 * @class NewsModel
 * @extends BaseModel
 * @description News model: News model for all news related operations
 */
@Service(newsModelToken)
export class NewsModel extends BaseModel {
  constructor() {
    super({
      collectionName: COLLECTION_NAME,
      _keys: keys<News>(),
      indexes: [
        {
          field: {
            'trans.title': 'text',
            title: 'text',
          },
        },
        {
          field: {
            'trans.title': 1,
          },
        },
        {
          field: {
            title: 1,
          },
        },
        {
          field: {
            'trans.slug': 1,
          },
        },
        {
          field: {
            slug: 1,
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
