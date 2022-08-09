import { Inject, Service } from 'typedi';
import Logger from '@/core/logger';
import { throwErr } from '@/utils/common';
import { alphabetSize12, alphabetSize6 } from '@/utils/randomString';
import { AuthError } from '@/modules/auth/auth.error';
import { SystemError } from '@/core/errors/CommonError';
import { EventModel, Event, EventInput, EventOutput } from '.';
import { Filter } from 'mongodb';
import { BaseQuery, PaginationResult } from '@/types/Common';
import AuthSessionModel from '@/modules/auth/authSession.model';
import { generateTextAlias } from '@/utils/text';
import httpStatus from 'http-status';
import { EventError } from './event.error';

@Service()
export class EventService {
  private logger = new Logger('EventService');

  @Inject()
  private eventModel: EventModel;

  @Inject()
  private authSessionModel: AuthSessionModel;

  /**
   * A bridge allows another service access to the Model layer
   */
  get collection() {
    return this.eventModel.collection;
  }

  /**
   * Generate ID
   */
  static async generateID() {
    return alphabetSize12();
  }
  /**
   *  Create new event
   * @param newEvent - New event
   * @returns {Promise<EventOutput>} - Created event
   */
  async create({ newEvent }: EventInput): Promise<EventOutput> {
    try {
      // Check duplicated
      // Create user
      const event: Event = {
        ...newEvent,
        id: await EventService.generateID(),
      };
      // Insert user to database
      const { acknowledged } = await this.eventModel.collection.insertOne(event);
      if (!acknowledged) {
        throwErr(new SystemError(`MongoDB insertOne() failed! Payload: ${JSON.stringify(newEvent)}`));
      }
      this.logger.debug('[create:success]', { event });
      return { code: httpStatus.CREATED, result: event };
    } catch (err) {
      this.logger.error('[create:error]', err.message);
      throw err;
    }
  }
  /**
   * Update event
   * @param id - Event ID
   * @param updateEvent - Update event
   * @returns { Promise<EventOutput> } - Updated event
   *
   **/
  async update({ updateEvent }: EventInput): Promise<EventOutput> {
    try {
      const { id, data } = updateEvent;
      const { value: event } = await this.eventModel.collection.findOneAndUpdate(
        { id },
        {
          $set: {
            ...data,
            updated_at: new Date(),
          },
        },
        { returnDocument: 'after' },
      );
      if (!event) throwErr(new EventError('EVENT_NOT_FOUND'));
      this.logger.debug('[update:success]', { data });
      return { code: httpStatus.OK, result: event };
    } catch (err) {
      this.logger.error('[update:error]', err.message);
    }
  }
}
