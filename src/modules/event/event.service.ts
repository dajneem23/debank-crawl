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
import { $lookup, $toObjectId, $pagination, $checkListIdExist } from '@/utils/mongoDB';
import { isNil, omit } from 'lodash';
import { BaseServiceInput, BaseServiceOutput } from '@/types';

@Service()
export class EventService {
  private logger = new Logger('EventService');

  @Inject()
  private model: EventModel;

  @Inject()
  private authSessionModel: AuthSessionModel;

  @Inject()
  private authService: AuthService;

  /**
   * A bridge allows another service access to the Model layer
   */
  get collection() {
    return this.model.collection;
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
      user: $lookup({
        from: 'users',
        refFrom: 'id',
        refTo: 'created_by',
        select: 'full_name avatar',
        reName: 'author',
        operation: '$eq',
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
  async create({ _content, _subject }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const now = new Date();
      const { categories, speakers } = _content;
      const categoriesIdExist =
        !!categories && categories.length > 0
          ? await $checkListIdExist({ collection: 'categories', listId: categories })
          : true;
      const speakerIdExist =
        !!speakers && speakers.length > 0 ? await $checkListIdExist({ collection: 'persons', listId: speakers }) : true;

      if (!(categoriesIdExist && speakerIdExist)) {
        throwErr(new EventError('INPUT_INVALID'));
      }
      const event: Event = {
        ..._content,
        categories: categories ? $toObjectId(categories) : [],
        speakers: speakers ? $toObjectId(speakers) : [],
        deleted: false,
        ...(_subject && { created_by: _subject }),
        created_at: now,
        updated_at: now,
      };
      // Check duplicated
      const isDuplicated = await this.model.collection.countDocuments({
        name: event.name,
        created_at: { $lte: getDateTime({ hour: 1 }) },
      });
      if (isDuplicated) {
        throwErr(new EventError('EVENT_ALREADY_EXIST'));
      }
      // Insert user to database
      const { acknowledged } = await this.model.collection.insertOne(event);
      if (!acknowledged) {
        throwErr(new SystemError(`MongoDB insertOne() failed! Payload: ${JSON.stringify(_content)}`));
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
  async update({ _id, _content, _subject }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { categories, speakers } = _content;
      const categoriesIdExist =
        !!categories && categories.length > 0
          ? await $checkListIdExist({ collection: 'categories', listId: categories })
          : true;
      const speakerIdExist =
        !!speakers && speakers.length > 0 ? await $checkListIdExist({ collection: 'persons', listId: speakers }) : true;

      if (!(categoriesIdExist && speakerIdExist)) {
        throwErr(new EventError('INPUT_INVALID'));
      }
      const { value: event } = await this.model.collection.findOneAndUpdate(
        $toMongoFilter({ _id }),
        {
          $set: {
            ..._content,
            ...(categories && { categories: $toObjectId(categories) }),
            ...(speakers && { speakers: $toObjectId(speakers) }),
            updated_at: new Date(),
            ...(_subject && { updated_by: _subject }),
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
  async delete({ _id, _subject }: BaseServiceInput): Promise<void> {
    try {
      const { value: event } = await this.model.collection.findOneAndUpdate(
        $toMongoFilter({ _id }),
        {
          $set: {
            deleted: true,
            deleted_at: new Date(),
            ...(_subject && { deleted_by: _subject }),
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
  async getById({ _id }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const [event] = await this.model.collection
        .aggregate([
          { $match: $toMongoFilter({ _id }) },
          this.lookups.categories,
          this.lookups.speakers,
          this.lookups.user,
          {
            $limit: 1,
          },
          // {
          //   $unwind: '$author',
          // },
        ])
        .toArray();
      if (isNil(event)) throwErr(new EventError('EVENT_NOT_FOUND'));
      this.logger.debug('[get:success]', { event });
      return omit(toOutPut({ item: event }), ['deleted', 'updated_at']);
    } catch (err) {
      this.logger.error('[get:error]', err.message);
      throw err;
    }
  }

  async getRelatedEvent({ _filter, _query }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { q, category, ...otherFilter } = _filter;
      const { per_page, page, sort_order } = _query;
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
      ] = (await this.model.collection
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
      return toPagingOutput({ items, total_count, keys: this.outputKeys });
    } catch (err) {
      this.logger.error('[get:error]', err.message);
      throw err;
    }
  }
  async getTrendingEvent({ _query, _filter }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { q } = _filter;
      const { per_page, sort_order } = _query;
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
      ] = (await this.model.collection
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
      return toPagingOutput({ items, total_count, keys: this.outputKeys });
    } catch (err) {
      this.logger.error('[get:error]', err.message);
      throw err;
    }
  }
  async getSignificantEvent({ _query, _filter }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { q } = _filter;
      const { per_page, page, sort_order } = _query;
      const eventFilter: Filter<any> = {
        start_date: { $gte: new Date() },
        significant: true,
      };
      const [
        {
          total_count: [{ total_count } = { total_count: 0 }],
          items,
        },
      ] = (await this.model.collection
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
      return toPagingOutput({ items, total_count, keys: this.outputKeys });
    } catch (err) {
      this.logger.error('[get:error]', err.message);
      throw err;
    }
  }
  /**
   *  Query category
   * @param {any} _filter
   * @param {BaseQuery} _query
   * @returns {Promise<BaseServiceOutput>}
   *
   **/
  async query({ _filter, _query }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { q, category, ...otherFilter } = _filter;
      const { page = 1, per_page, sort_by, sort_order } = _query;
      const categoryFilter = category
        ? {
            categories: { $in: Array.isArray(category) ? $toObjectId(category) : $toObjectId([category]) },
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
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model.collection
        .aggregate(
          $pagination({
            $match: {
              ...$toMongoFilter(eventFilter),
            },
            ...(sort_by && sort_order && { $sort: { [sort_by]: sort_order == 'asc' ? 1 : -1 } }),
            ...(per_page && page && { items: [{ $skip: +per_page * (+page - 1) }, { $limit: +per_page }] }),
          }),
        )
        .toArray();
      this.logger.debug('[query:success]', { total_count, items });
      return toPagingOutput({ items, total_count, keys: this.outputKeys });
    } catch (err) {
      this.logger.error('[query:error]', err.message);
      throw err;
    }
  }
}
