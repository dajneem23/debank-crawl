import { Inject, Service } from 'typedi';
import Logger from '@/core/logger';
import { getDateTime, throwErr, toOutPut, toPagingOutput } from '@/utils/common';
import { alphabetSize12 } from '@/utils/randomString';
import { SystemError } from '@/core/errors/CommonError';
import { EventModel, Event, EventInput, EventOutput } from '.';
import { Filter } from 'mongodb';
import { $toMongoFilter } from '@/utils/mongoDB';
import AuthSessionModel from '@/modules/auth/authSession.model';
import { EventError } from './event.error';
import AuthService from '../auth/auth.service';
import { $lookup, $toObjectId, $pagination } from '@/utils/mongoDB';

@Service()
export class EventService {
  private logger = new Logger('EventService');

  @Inject()
  private eventModel: EventModel;

  @Inject()
  private authSessionModel: AuthSessionModel;

  @Inject()
  private authService: AuthService;

  /**
   * A bridge allows another service access to the Model layer
   */
  get collection() {
    return this.eventModel.collection;
  }

  get outputKeys() {
    return [
      'id',
      'name',
      'introduction',
      'tel',
      'email',
      'about',
      'avatar',
      'agendas',
      'location',
      'start_date',
      'end_date',
      'country',
      'speakers',
      'sponsors',
      'facebook',
      'twitter',
      'website',
      'instagram',
      'linkedin',
      'github',
      'medium',
      'youtube',
      'website',
      'blog',
      'reddit',
    ];
  }
  get lookups() {
    return {
      speakers: $lookup({
        from: 'persons',
        refFrom: '_id',
        refTo: 'speakers',
        select: 'name',
        reName: 'speakers',
        operation: '$in',
      }),
      sponsors: {},
      categories: $lookup({
        from: 'categories',
        refFrom: '_id',
        refTo: 'categories',
        select: 'title',
        reName: 'categories',
        operation: '$in',
      }),
    };
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
  async create({ newEvent, subject }: EventInput): Promise<EventOutput> {
    try {
      const now = new Date();
      const { categories, speakers } = newEvent;
      const event: Event = {
        ...newEvent,
        ...(categories && { categories: $toObjectId(categories) }),
        ...(speakers && { speakers: $toObjectId(speakers) }),
        deleted: false,
        ...(subject && { created_by: subject }),
        created_at: now,
        updated_at: now,
      };
      // Check duplicated
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
      return toOutPut({ item: event, keys: this.outputKeys });
    } catch (err) {
      this.logger.error('[create:error]', err.message);
      throw err;
    }
  }
  /**
   * Update event
   * @param id - Event ID
   * @param updateEvent - Update event
   * @param updateUser - User who update event
   * @returns { Promise<EventOutput> } - Updated event
   *
   **/
  async update({ _id, updateEvent, subject }: EventInput): Promise<EventOutput> {
    try {
      const { categories, speakers } = updateEvent;
      const { value: event } = await this.eventModel.collection.findOneAndUpdate(
        $toMongoFilter({ _id }),
        {
          $set: {
            ...updateEvent,
            ...(categories && { categories: $toObjectId(categories) }),
            ...(speakers && { speakers: $toObjectId(speakers) }),
            updated_at: new Date(),
            ...(subject && { updated_by: subject }),
          },
        },
        { returnDocument: 'after' },
      );
      if (!event) throwErr(new EventError('EVENT_NOT_FOUND'));
      this.logger.debug('[update:success]', { event });
      return toOutPut({ item: event, keys: this.outputKeys });
    } catch (err) {
      this.logger.error('[update:error]', err.message);
      throw err;
    }
  }
  /**
   * Delete event by ID
   * @param id - Event ID
   * @param deleteUser - User who delete event
   * @returns { Promise<void> } - Deleted event
   */
  async delete({ _id, subject }: EventInput): Promise<void> {
    try {
      const { value: event } = await this.eventModel.collection.findOneAndUpdate(
        $toMongoFilter({ _id }),
        {
          $set: {
            deleted: true,
            deleted_at: new Date(),
            ...(subject && { deleted_by: subject }),
          },
        },
        { returnDocument: 'after' },
      );
      if (!event) throwErr(new EventError('EVENT_NOT_FOUND'));
      this.logger.debug('[delete:success]', { event });
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
      const [{ event } = { event: {} }] = (await this.eventModel.collection
        .aggregate([
          { $match: $toMongoFilter({ _id }) },
          this.lookups.categories,
          this.lookups.speakers,
          {
            $facet: {
              event: [{ $limit: 1 }],
            },
          },
          {
            $unwind: '$event',
          },
        ])
        .toArray()) as any[];

      if (!!!event) throwErr(new EventError('EVENT_NOT_FOUND'));
      this.logger.debug('[get:success]', { event });
      return toOutPut({ item: event });
    } catch (err) {
      this.logger.error('[get:error]', err.message);
      throw err;
    }
  }

  async getRelatedEvent({ filter, query }: EventInput): Promise<EventOutput> {
    try {
      const { q, category, ...otherFilter } = filter;
      const { per_page, page, sort_order } = query;
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
              ...$toMongoFilter(eventFilter),
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
      return toPagingOutput({ items, count: total_count, keys: this.outputKeys });
    } catch (err) {
      this.logger.error('[get:error]', err.message);
      throw err;
    }
  }
  async getTrendingEvent({ query }: EventInput): Promise<EventOutput> {
    try {
      const { q, per_page, sort_order } = query;
      const eventFilter: Filter<any> = {
        $or: [{ trending: true }, { type: 'virtual' }],
        $and: [{ start_date: { $gte: new Date() } }],
      };
      const [
        {
          total_count: [{ total_count } = { total_count: 0 }],
          trending,
          virtual,
        },
      ] = (await this.eventModel.collection
        .aggregate([
          {
            $match: {
              ...$toMongoFilter(eventFilter),
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
      const items = [...trending, ...virtual];
      this.logger.debug('[get:success]', { total_count, items });
      return toPagingOutput({ items, count: total_count, keys: this.outputKeys });
    } catch (err) {
      this.logger.error('[get:error]', err.message);
      throw err;
    }
  }
  async getSignificantEvent({ query }: EventInput): Promise<EventOutput> {
    try {
      const { q, per_page, page, sort_order } = query;
      const eventFilter: Filter<any> = {
        start_date: { $gte: new Date() },
        significant: true,
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
              ...$toMongoFilter(eventFilter),
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
      return toPagingOutput({ items, count: total_count, keys: this.outputKeys });
    } catch (err) {
      this.logger.error('[get:error]', err.message);
      throw err;
    }
  }
}
