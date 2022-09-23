import Container, { Inject, Service, Token } from 'typedi';
import Logger from '@/core/logger';
import { getDateTime, throwErr, toOutPut, toPagingOutput } from '@/utils/common';
import { alphabetSize12 } from '@/utils/randomString';
import { _event, eventModelToken } from '.';
import { $keysToProject, $toMongoFilter } from '@/utils/mongoDB';
import AuthSessionModel from '@/modules/auth/authSession.model';
import { EventError } from './event.error';
import AuthService from '../auth/auth.service';
import { $toObjectId, $pagination } from '@/utils/mongoDB';
import { isNil, omit } from 'lodash';
import { BaseServiceInput, BaseServiceOutput, EventType, PRIVATE_KEYS } from '@/types';

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
    return ['id', 'name', 'banners', 'slug', 'introduction', 'type', 'country', 'start_date', 'end_date', 'categories'];
  }
  get publicOutputKeys() {
    return ['id', 'name', 'introduction', 'type', 'start_date', 'end_date', 'banners', 'slug', 'categories'];
  }
  get transKeys() {
    return ['name', 'introduction'];
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
      const { name, subscribers = [], trans = [] } = _content;
      const value = await this.model.create(
        {
          name,
          created_at: { $lte: getDateTime({ hour: 1 }) },
        },
        {
          ..._event,
          ..._content,
          subscribers,
          trans,
          ...(_subject && { created_by: _subject }),
        },
      );
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
  async getById({ _id, _filter, _permission = 'public' }: BaseServiceInput): Promise<BaseServiceOutput> {
    const { lang } = _filter;
    try {
      const [item] = await this.model
        .get([
          {
            $match: $toMongoFilter({
              _id,
              ...(lang && {
                'trans.lang': { $eq: lang },
              }),
            }),
          },
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
            $project: {
              ...$keysToProject(this.outputKeys),
              trans: {
                $filter: {
                  input: '$trans',
                  as: 'trans',
                  cond: {
                    $eq: ['$$trans.lang', lang],
                  },
                },
              },
            },
          },
          this.model.$sets.trans,
          {
            $project: {
              ...$keysToProject(this.outputKeys),
              ...(lang && $keysToProject(this.transKeys, '$trans')),
            },
          },
          {
            $limit: 1,
          },
        ])
        .toArray();
      if (isNil(item)) throwErr(new EventError('EVENT_NOT_FOUND'));
      this.logger.debug('get_success', { item });
      return _permission == 'private' ? toOutPut({ item }) : omit(toOutPut({ item }), PRIVATE_KEYS);
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
  async getBySlug({ _slug, _filter, _permission = 'public' }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { lang } = _filter;
      const [item] = await this.model
        .get([
          {
            $match: $toMongoFilter({
              slug: _slug,
              ...(lang && {
                'trans.lang': { $eq: lang },
              }),
            }),
          },
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
            $project: {
              ...$keysToProject(this.outputKeys),
              trans: {
                $filter: {
                  input: '$trans',
                  as: 'trans',
                  cond: {
                    $eq: ['$$trans.lang', lang],
                  },
                },
              },
            },
          },
          this.model.$sets.trans,
          {
            $project: {
              ...$keysToProject(this.outputKeys),
              ...(lang && $keysToProject(this.transKeys, '$trans')),
            },
          },
          {
            $limit: 1,
          },
        ])
        .toArray();
      if (isNil(item)) throwErr(new EventError('EVENT_NOT_FOUND'));
      this.logger.debug('get_success', { item });
      return _permission == 'private' ? toOutPut({ item }) : omit(toOutPut({ item }), PRIVATE_KEYS);
    } catch (err) {
      this.logger.error('get_error', err.message);
      throw err;
    }
  }

  async getRelatedEvent({ _filter, _query }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { q, category, lang, ...otherFilter } = _filter;
      const { per_page, page, sort_order } = _query;
      const [
        {
          total_count: [{ total_count } = { total_count: 0 }],
          items,
        },
      ] = (await this.model
        .get([
          {
            $match: {
              ...$toMongoFilter({
                ...otherFilter,
                ...(category && {
                  categories: {
                    $in: $toObjectId(Array.isArray(category) ? category : [category]),
                  },
                }),
                // start_date: { $gte: new Date() },
                ...(q && {
                  $or: [{ name: { $regex: q, $options: 'i' } }],
                }),
                ...(lang && {
                  'trans.lang': { $eq: lang },
                }),
              }),
            },
          },
          this.model.$addFields.categories,
          this.model.$lookups.categories,
          {
            $project: {
              ...$keysToProject(this.publicOutputKeys),
              trans: {
                $filter: {
                  input: '$trans',
                  as: 'trans',
                  cond: {
                    $eq: ['$$trans.lang', lang],
                  },
                },
              },
            },
          },
          this.model.$lookups.country,
          this.model.$sets.country,
          this.model.$sets.trans,
          {
            $project: {
              ...$keysToProject(this.publicOutputKeys),
              ...(lang && $keysToProject(this.transKeys, '$trans')),
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

      this.logger.debug('get_success', { total_count, items });
      return toPagingOutput({ items, total_count, keys: this.queryOutputKeys });
    } catch (err) {
      this.logger.error('get_error', err.message);
      throw err;
    }
  }
  async getTrendingEvent({ _query, _filter }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { lang } = _filter;
      const { per_page, sort_order } = _query;
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
              ...$toMongoFilter({
                $or: [{ trending: true }, { type: EventType.VIRTUAL }],
                // $and: [{ start_date: { $gte: new Date() } }],
                ...(lang && {
                  'trans.lang': { $eq: lang },
                }),
              }),
            },
          },
          {
            $project: {
              ...$keysToProject(this.publicOutputKeys),
              trans: {
                $filter: {
                  input: '$trans',
                  as: 'trans',
                  cond: {
                    $eq: ['$$trans.lang', lang],
                  },
                },
              },
            },
          },
          {
            $addFields: this.model.$addFields.categories,
          },
          this.model.$lookups.categories,
          this.model.$sets.trans,
          this.model.$lookups.country,
          this.model.$sets.country,
          {
            $project: {
              ...$keysToProject(this.publicOutputKeys),
              ...(lang && $keysToProject(this.transKeys, '$trans')),
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
      this.logger.debug('get_success', { total_count, items });
      return toPagingOutput({ items, total_count, keys: this.queryOutputKeys });
    } catch (err) {
      this.logger.error('get_error', err.message);
      throw err;
    }
  }
  async getSignificantEvent({ _query, _filter }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { q, lang } = _filter;
      const { per_page, page, sort_order } = _query;
      const [
        {
          total_count: [{ total_count } = { total_count: 0 }],
          items,
        },
      ] = (await this.model
        .get([
          {
            $match: {
              ...$toMongoFilter({
                significant: true,
                ...(lang && {
                  'trans.lang': { $eq: lang },
                }),
              }),
            },
          },
          {
            $project: {
              ...$keysToProject(this.publicOutputKeys),
              trans: {
                $filter: {
                  input: '$trans',
                  as: 'trans',
                  cond: {
                    $eq: ['$$trans.lang', lang],
                  },
                },
              },
            },
          },
          {
            $addFields: this.model.$addFields.categories,
          },
          this.model.$sets.trans,
          this.model.$lookups.categories,
          this.model.$lookups.country,
          this.model.$sets.country,
          {
            $project: {
              ...$keysToProject(this.publicOutputKeys),
              ...(lang && $keysToProject(this.transKeys, '$trans')),
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
      const { q, category, lang, ...otherFilter } = _filter;
      const { page = 1, per_page, sort_by, sort_order } = _query;
      const [{ total_count } = { total_count: 0 }, ...items] = await this.model
        .get([
          ...$pagination({
            $match: {
              ...$toMongoFilter({
                ...otherFilter,
                ...(category && {
                  categories: {
                    $in: $toObjectId(Array.isArray(category) ? category : [category]),
                  },
                }),
                // start_date: { $gte: new Date() },
                ...(q && {
                  $or: [{ name: { $regex: q, $options: 'i' } }],
                }),
                ...(lang && {
                  'trans.lang': { $eq: lang },
                }),
              }),
            },
            $projects: [
              {
                $project: {
                  ...$keysToProject(this.publicOutputKeys),
                  trans: {
                    $filter: {
                      input: '$trans',
                      as: 'trans',
                      cond: {
                        $eq: ['$$trans.lang', lang],
                      },
                    },
                  },
                },
              },
            ],
            $addFields: this.model.$addFields.categories,
            $more: [
              this.model.$sets.trans,
              this.model.$lookups.categories,
              this.model.$lookups.country,
              this.model.$sets.country,
              {
                $project: {
                  ...$keysToProject(this.publicOutputKeys),
                  ...(lang && $keysToProject(this.transKeys, '$trans')),
                },
              },
            ],
            ...(sort_by && sort_order && { $sort: { [sort_by]: sort_order == 'asc' ? 1 : -1 } }),
            ...(per_page && page && { items: [{ $skip: +per_page * (+page - 1) }, { $limit: +per_page }] }),
          }),
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
              ...(lang && {
                'trans.lang': { $eq: lang },
              }),
            },
            $addFields: this.model.$addFields.categories,
            $lookups: [this.model.$lookups.author, this.model.$lookups.categories],
            $projects: [
              {
                $project: {
                  ...$keysToProject(this.publicOutputKeys),
                  trans: {
                    $filter: {
                      input: '$trans',
                      as: 'trans',
                      cond: {
                        $eq: ['$$trans.lang', lang],
                      },
                    },
                  },
                },
              },
            ],
            $more: [
              this.model.$sets.trans,
              {
                $project: {
                  ...$keysToProject(this.publicOutputKeys),
                  ...(lang && $keysToProject(this.transKeys, '$trans')),
                },
              },
            ],
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
