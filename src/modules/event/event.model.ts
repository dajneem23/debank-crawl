import { Inject, Service, Token } from 'typedi';
import { Event } from './event.type';
import { keys } from 'ts-transformer-keys';
import { BaseModel } from '../base/base.model';

const COLLECTION_NAME = 'events';
const TOKEN_NAME = '_eventModel';
export const eventModelToken = new Token<EventModel>(TOKEN_NAME);
/**
 * @class EventModel
 * @description Event model: Event model for all event related operations
 * @extends BaseModel
 */
@Service(eventModelToken)
export class EventModel extends BaseModel {
  constructor() {
    super({
      collectionName: COLLECTION_NAME,
      _keys: keys<Event>(),
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
