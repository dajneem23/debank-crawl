import { Inject, Service } from 'typedi';
import Logger from '@/core/logger';
import { getDateTime, throwErr, toOutPut } from '@/utils/common';
import { alphabetSize12, alphabetSize6 } from '@/utils/randomString';
import { AuthError } from '@/modules/auth/auth.error';
import { SystemError } from '@/core/errors/CommonError';
import { EventModel, Event, EventInput, EventOutput } from '.';
import { Filter } from 'mongodb';
import { BaseQuery, PaginationResult, toMongoFilter } from '@/types/Common';
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

  private NUM_OF_EVENTS = {
    DEFAULT: 10,
    TRENDING: 2,
  };
  /**
   *  Create new event
   * @param newEvent - New event
   * @returns {Promise<EventOutput>} - Created event
   */
  async create({ newEvent }: EventInput): Promise<EventOutput> {
    try {
      // Check duplicated
      // Create user
      const now = new Date();
      const event: Event = {
        ...newEvent,
        deleted: false,
        created_at: now,
        updated_at: now,
      };
      const isDuplicated = await this.eventModel.collection.countDocuments({
        name: event.name,
        created_at: { $lte: getDateTime({ hour: 1 }) },
      });
      if (isDuplicated) {
        throwErr(new EventError('EVENT_ALREADY_EXIST'));
      }
      // Insert user to database
      const { acknowledged } = await this.eventModel.collection.insertOne(event);
      if (!acknowledged) {
        throwErr(new SystemError(`MongoDB insertOne() failed! Payload: ${JSON.stringify(newEvent)}`));
      }
      this.logger.debug('[create:success]', { event });
      return toOutPut({ data: event });
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
  async update({ _id, updateEvent }: EventInput): Promise<EventOutput> {
    try {
      const { value: event } = await this.eventModel.collection.findOneAndUpdate(
        toMongoFilter({ _id }),
        {
          $set: {
            ...updateEvent,
            updated_at: new Date(),
          },
        },
        { returnDocument: 'after' },
      );
      if (!event) throwErr(new EventError('EVENT_NOT_FOUND'));
      this.logger.debug('[update:success]', { event });
      return toOutPut({ data: event });
    } catch (err) {
      this.logger.error('[update:error]', err.message);
      throw err;
    }
  }
  /**
   * Delete event by ID
   * @param id - Event ID
   * @returns { Promise<EventOutput> } - Deleted event
   */
  async delete({ _id }: EventInput): Promise<EventOutput> {
    try {
      const { value: event } = await this.eventModel.collection.findOneAndUpdate(
        toMongoFilter({ _id }),
        {
          $set: {
            deleted: true,
            deleted_at: new Date(),
          },
        },
        { returnDocument: 'after' },
      );
      if (!event) throwErr(new EventError('EVENT_NOT_FOUND'));
      this.logger.debug('[delete:success]', { event });
      return toOutPut({ data: event });
    } catch (err) {
      this.logger.error('[delete:error]', err.message);
      throw err;
    }
  }
  /**
   * Get event by ID
   * @param id - Event ID
   * @returns { Promise<EventOutput> } - Event
   */
  async getById({ _id }: EventInput): Promise<EventOutput> {
    try {
      const event = await this.eventModel.collection.findOne(toMongoFilter({ _id }));
      if (!event) throwErr(new EventError('EVENT_NOT_FOUND'));
      this.logger.debug('[get:success]', { event });
      return toOutPut({ data: event });
    } catch (err) {
      this.logger.error('[get:error]', err.message);
      throw err;
    }
  }

  async queryRelatedEvent({ filter, query }: EventInput): Promise<EventOutput> {
    try {
      const { q, category, ...otherFilter } = filter;
      const { per_page, page, sort_by, sort_order } = query;
      const categoryFilter = category
        ? {
            categories: { $in: Array.isArray(category) ? category : [category] },
          }
        : {};
      const eventFilter: Filter<any> = {
        ...otherFilter,
        ...categoryFilter,
        start_date: { $gte: new Date() },
        ...(q && {
          $or: [{ name: { $regex: q, $options: 'i' } }],
        }),
      };
      const [
        {
          total_count: [{ total_count } = { total_count: 0 }],
          items,
        },
      ] = (await this.eventModel.collection
        .aggregate([
          {
            $match: {
              ...toMongoFilter(eventFilter),
            },
          },
          { $sort: { start_date: sort_order === 'asc' ? 1 : -1 } },
          {
            $facet: {
              total_count: [{ $count: 'total_count' }],
              items: [{ $skip: +per_page * (+page - 1) }, { $limit: +per_page }],
            },
          },
        ])
        .toArray()) as any[];

      this.logger.debug('[get:success]', { total_count, items });
      return toOutPut({ data: { total_count, items, code: httpStatus.OK } });
    } catch (err) {
      this.logger.error('[get:error]', err.message);
      throw err;
    }
  }
  async queryTrendingEvent({ filter, query }: EventInput): Promise<EventOutput> {
    try {
      const { q, per_page, page, sort_by, sort_order } = query;
      const eventFilter: Filter<any> = {
        $or: [{ trending: true }, { type: 'virtual' }],
        $and: [{ start_date: { $gte: new Date() } }],
      };
      const [
        {
          total_count: [{ total_count } = { total_count: 0 }],
          ...items
        },
      ] = (await this.eventModel.collection
        .aggregate([
          {
            $match: {
              ...toMongoFilter(eventFilter),
            },
          },
          { $sort: { start_date: sort_order === 'asc' ? 1 : -1 } },
          {
            $facet: {
              total_count: [{ $count: 'total_count' }],
              trending: [{ $match: { trending: true } }, { $limit: +per_page }],
              virtual: [{ $match: { type: 'virtual' } }, { $limit: +per_page }],
            },
          },
        ])
        .toArray()) as any[];

      this.logger.debug('[get:success]', { total_count, items });
      return toOutPut({ data: { total_count, items, code: httpStatus.OK } });
    } catch (err) {
      this.logger.error('[get:error]', err.message);
      throw err;
    }
  }
  async querySignificantEvent({ filter, query }: EventInput): Promise<EventOutput> {
    try {
      const { q, per_page, page, sort_by, sort_order } = query;
      const eventFilter: Filter<any> = {
        start_date: { $gte: new Date() },
        significant: true,
      };
      const [
        {
          total_count: [{ total_count } = { total_count: 0 }],
          ...items
        },
      ] = (await this.eventModel.collection
        .aggregate([
          {
            $match: {
              ...toMongoFilter(eventFilter),
            },
          },
          { $sort: { start_date: sort_order === 'asc' ? 1 : -1 } },
          {
            $facet: {
              total_count: [{ $count: 'total_count' }],
              items: [{ $skip: +per_page * (+page - 1) }, { $limit: +per_page }],
            },
          },
        ])
        .toArray()) as any[];

      this.logger.debug('[get:success]', { total_count, items });
      return toOutPut({ data: { total_count, items, code: httpStatus.OK } });
    } catch (err) {
      this.logger.error('[get:error]', err.message);
      throw err;
    }
  }
}
