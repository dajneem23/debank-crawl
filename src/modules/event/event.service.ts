import Container, { Inject, Service, Token } from 'typedi';
import Logger from '@/core/logger';
import { getDateTime, throwErr, toOutPut, toPagingOutput } from '@/utils/common';
import { alphabetSize12 } from '@/utils/randomString';
import { EventOutput, _event, eventModelToken } from '.';
import { Filter } from 'mongodb';
import { $toMongoFilter } from '@/utils/mongoDB';
import AuthSessionModel from '@/modules/auth/authSession.model';
import { EventError } from './event.error';
import AuthService from '../auth/auth.service';
import { $toObjectId, $pagination } from '@/utils/mongoDB';
import { isNil, omit } from 'lodash';
import { BaseServiceInput, BaseServiceOutput } from '@/types';

const TOKEN_NAME = '_eventService';
/**
 * A bridge allows another service access to the Model layer
 * @export EventService
 * @class EventService
 * @extends {BaseService}
 */
export const eventServiceToken = new Token<EventService>(TOKEN_NAME);
/**
 * @class EventService
 * @description Event service: Event service for all event related operations
 * @extends BaseService
 */
@Service(eventServiceToken)
export class EventService {
  private logger = new Logger('EventService');

  private model = Container.get(eventModelToken);

  @Inject()
  private authSessionModel: AuthSessionModel;

  @Inject()
  private authService: AuthService;

  get outputKeys() {
    return this.model._keys;
  }
  get queryOutputKeys() {
    return ['id', 'name', 'slug', 'introduction', 'type', 'country', 'start_date', 'end_date', 'categories'];
  }
  get publicOutputKeys() {
    return ['id', 'name', 'start_date', 'end_date', 'banners', 'slug'];
  }

  /**
   * Generate ID
   */
  static async generateID() {
    return alphabetSize12();
  }

  /**
   *  Create new event
   * @param _content - New event
   * @param _subject - User who create event
   * @returns {Promise<EventOutput>} - Created event
   */
  async create({ _content, _subject }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { name, subscribers } = _content;
      const value = await this.model.create(
        {
          name,
          created_at: { $lte: getDateTime({ hour: 1 }) },
        },
        {
          ..._event,
          ..._content,
          subscribers: subscribers || [],
          ...(_subject && { created_by: _subject }),
        },
      );
      // Check duplicated
      this.logger.debug('create_success', { value });
      return toOutPut({ item: value, keys: this.outputKeys });
    } catch (err) {
      this.logger.error('create_error', err.message);
      throw err;
    }
  }
  /**
   * Update event
   * @param id - Event ID
   * @param _content - Update event
   * @param _subject - User who update event
   * @returns { Promise<EventOutput> } - Updated event
   *
   **/
  async update({ _id, _content, _subject }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { slide, recap, subscribers } = _content;
      const event = await this.model.update(
        $toMongoFilter({ _id }),
        {
          $set: {
            ..._content,
            subscribers: subscribers || [],
            updated_at: new Date(),
            ...(_subject && { updated_by: _subject }),
          },
        },
        { returnDocument: 'after' },
      );
      if (slide || recap) {
        // Send mail to subscribers
        const { subscribers } = event;
        this.logger.info('success', '[send mail]', { subscribers });
      }
      this.logger.debug('update_success', { event });
      return toOutPut({ item: event, keys: this.outputKeys });
    } catch (err) {
      this.logger.error('update_error', err.message);
      throw err;
    }
  }
  /**
   * Delete event by ID
   * @param _id - Event ID
   * @param _subject - User who delete event
   * @returns { Promise<void> } - Deleted event
   */
  async delete({ _id, _subject }: BaseServiceInput): Promise<void> {
    try {
      await this.model.delete(
        $toMongoFilter({ _id }),
        {
          deleted: true,
          deleted_at: new Date(),
          ...(_subject && { deleted_by: _subject }),
        },
        { returnDocument: 'after' },
      );
      this.logger.debug('delete_success', { _id });
    } catch (err) {
      this.logger.error('delete_error', err.message);
      throw err;
    }
  }
  /**
   * Get event by ID
   * @param _id - Event ID
   * @returns { Promise<EventOutput> } - Event
   */
  async getById({ _id }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const [event] = await this.model
        .get([
          { $match: $toMongoFilter({ _id }) },
          {
            $addFields: this.model.$addFields.categories,
          },
          this.model.$lookups.categories,
          this.model.$lookups.speakers,
          this.model.$lookups.country,
          this.model.$sets.country,
          this.model.$lookups.author,
          this.model.$sets.author,
          {
            $limit: 1,
          },
        ])
        .toArray();
      if (isNil(event)) throwErr(new EventError('EVENT_NOT_FOUND'));
      this.logger.debug('get_success', { event });
      return omit(toOutPut({ item: event }), ['deleted', 'updated_at']);
    } catch (err) {
      this.logger.error('get_error', err.message);
      throw err;
    }
  }
  /**
   * Get event by ID
   * @param _id - Event ID
   * @returns { Promise<EventOutput> } - Event
   */
  async getBySlug({ _slug }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const [event] = await this.model
        .get([
          { $match: $toMongoFilter({ slug: _slug }) },
          {
            $addFields: this.model.$addFields.categories,
          },
          this.model.$lookups.categories,
          this.model.$lookups.speakers,
          this.model.$lookups.country,
          this.model.$sets.country,
          this.model.$lookups.author,
          this.model.$sets.author,
          {
            $limit: 1,
          },
        ])
        .toArray();
      if (isNil(event)) throwErr(new EventError('EVENT_NOT_FOUND'));
      this.logger.debug('get_success', { event });
      return omit(toOutPut({ item: event }), ['deleted', 'updated_at']);
    } catch (err) {
      this.logger.error('get_error', err.message);
      throw err;
    }
  }

  async getRelatedEvent({ _filter, _query }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { q, category, ...otherFilter } = _filter;
      const { per_page, page, sort_order } = _query;
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
      const [
        {
          total_count: [{ total_count } = { total_count: 0 }],
          items,
        },
      ] = (await this.model
        .get([
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
          this.model.$lookups.country,
          this.model.$sets.country,
        ])
        .toArray()) as any[];

      this.logger.debug('get_success', { total_count, items });
      return toPagingOutput({ items, total_count, keys: this.queryOutputKeys });
    } catch (err) {
      this.logger.error('get_error', err.message);
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
      ] = (await this.model
        .get([
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
          this.model.$lookups.country,
          this.model.$sets.country,
        ])
        .toArray()) as any[];
      const items = [...trending, ...virtual];
      this.logger.debug('get_success', { total_count, items });
      return toPagingOutput({ items, total_count, keys: this.queryOutputKeys });
    } catch (err) {
      this.logger.error('get_error', err.message);
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
      ] = (await this.model
        .get([
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
          this.model.$lookups.country,
          this.model.$sets.country,
        ])
        .toArray()) as any[];

      this.logger.debug('get_success', { total_count, items });
      return toPagingOutput({ items, total_count, keys: this.queryOutputKeys });
    } catch (err) {
      this.logger.error('get_error', err.message);
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
        // start_date: { $gte: new Date() },
        ...(q && {
          $or: [{ name: { $regex: q, $options: 'i' } }],
        }),
      };
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model
        .get([
          ...$pagination({
            $match: {
              ...$toMongoFilter(eventFilter),
            },
            ...(sort_by && sort_order && { $sort: { [sort_by]: sort_order == 'asc' ? 1 : -1 } }),
            ...(per_page && page && { items: [{ $skip: +per_page * (+page - 1) }, { $limit: +per_page }] }),
          }),
          {
            $addFields: this.model.$addFields.categories,
          },
          this.model.$lookups.categories,
          this.model.$lookups.country,
          this.model.$sets.country,
        ])
        .toArray();
      this.logger.debug('query_success', { total_count, items });
      return toPagingOutput({
        items,
        total_count,
        keys: this.queryOutputKeys,
      });
    } catch (err) {
      this.logger.error('query_error', err.message);
      throw err;
    }
  }
  /**
   * Update event
   * @param id - Event ID
   * @param _content - Update event
   * @param _subject - User who update event
   * @returns { Promise<EventOutput> } - Updated event
   *
   **/
  async subscribe({ _id, _content, _subject }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { subscribers } = _content;

      const { value: event } = await this.model.update(
        $toMongoFilter({ _id }),
        {
          $set: {
            updated_at: new Date(),
            ...(_subject && { updated_by: _subject }),
          },
          $addToSet: {
            subscribers: Array.isArray(subscribers) ? { $each: subscribers } : subscribers,
          },
        },
        { returnDocument: 'after' },
      );
      if (!event) throwErr(new EventError('EVENT_NOT_FOUND'));
      if (subscribers) {
        // Send mail to subscribers
        const { subscribers } = event;
        this.logger.info('success', 'send mail', { subscribers });
      }
      this.logger.debug('update_success', { event });
      return toOutPut({ item: event, keys: ['subscribers'] });
    } catch (err) {
      this.logger.error('update_error', err.message);
      throw err;
    }
  }
  /**
   * Search by text index
   * @param {BaseServiceInput} _filter _query
   * @returns
   */
  async search({ _filter, _query }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { q, lang } = _filter;
      const { page = 1, per_page = 10, sort_by, sort_order } = _query;
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model
        .get([
          ...$pagination({
            $match: {
              ...(q && {
                $or: [{ $text: { $search: q } }, { name: { $regex: q, $options: 'i' } }],
              }),
            },
            $addFields: this.model.$addFields.categories,
            $lookups: [this.model.$lookups.author, this.model.$lookups.categories],

            ...(per_page && page && { items: [{ $skip: +per_page * (+page - 1) }, { $limit: +per_page }] }),
          }),
        ])
        .toArray();
      this.logger.debug('query_success', { total_count, items });
      return toPagingOutput({ items, total_count, keys: this.publicOutputKeys });
    } catch (err) {
      this.logger.error('query_error', err.message);
      throw err;
    }
  }
}
