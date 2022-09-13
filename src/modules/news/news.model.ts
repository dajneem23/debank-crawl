import { Db } from 'mongodb';
import { Inject, Service } from 'typedi';
import { DIMongoDB } from '@/loaders/mongoDBLoader';
import { DILogger } from '@/loaders/loggerLoader';
import Logger from '@/core/logger';
import { News } from './news.type';
import { BaseModel } from '../base/base.model';
import { keys } from 'ts-transformer-keys';
/**
 * @class NewsModel
 * @extends BaseModel
 * @description News model: News model for all news related operations
 */
@Service('_newsModel')
export class NewsModel extends BaseModel {
  constructor() {
    super({
      collectionName: 'news',
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
