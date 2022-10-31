import Container, { Inject, Service, Token } from 'typedi';
import Logger from '@/core/logger';
import { getDateTime, throwErr, toOutPut, toPagingOutput } from '@/utils/common';
import { _event, eventModelToken } from '.';
import { $keysToProject, $toMongoFilter } from '@/utils/mongoDB';
import AuthSessionModel from '@/modules/auth/authSession.model';
import { EventError } from './event.error';
import AuthService from '../auth/auth.service';
import { $pagination } from '@/utils/mongoDB';
import { isNil, omit } from 'lodash';
import { BaseServiceInput, BaseServiceOutput, EventType, PRIVATE_KEYS } from '@/types';
import { $refValidation } from '@/utils/validation';

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

  readonly model = Container.get(eventModelToken);

  @Inject()
  private authSessionModel: AuthSessionModel;

  @Inject()
  private authService: AuthService;

  get outputKeys() {
    return this.model._keys;
  }
  get publicOutputKeys() {
    return ['id', 'name', 'banners', 'slug', 'introduction', 'type', 'country', 'start_date', 'end_date', 'categories'];
  }
  get transKeys() {
    return ['name', 'introduction'];
  }

  /**
   *  Create new event
   * @param _content - New event
   * @param _subject - User who create event
   * @returns {Promise<EventOutput>} - Created event
   */
  async create({ _content, _subject }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const {
        name,
        subscribers = [],
        trans = [],
        start_date,
        end_date,
        company_sponsors = [],
        person_sponsors = [],
        fund_sponsors = [],
      } = _content;
      if (start_date && end_date && new Date(start_date) > new Date(end_date)) {
        throw this.model.error('common.validation_failed', [
          {
            path: 'start_date & end_date',
            message: `start_date must be less than end_date`,
          },
        ]);
      }
      company_sponsors.length &&
        (await $refValidation({
          collection: 'companies',
          list: company_sponsors,
          Refname: 'company_sponsors',
        })) &&
        (_content.company_sponsors = company_sponsors);
      fund_sponsors.length &&
        (await $refValidation({
          collection: 'funds',
          list: fund_sponsors,
          Refname: 'funds',
        })) &&
        (_content.fund_sponsors = fund_sponsors);
      person_sponsors.length &&
        (await $refValidation({
          collection: 'persons',
          list: person_sponsors,
          Refname: 'person_sponsors',
        })) &&
        (_content.person_sponsors = person_sponsors);
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
      this.logger.debug('create_success', JSON.stringify(_content));
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
      const { slide, recap, company_sponsors = [], fund_sponsors = [], person_sponsors = [] } = _content;
      company_sponsors.length &&
        (await $refValidation({
          collection: 'companies',
          list: company_sponsors,
          Refname: 'company_sponsors',
        })) &&
        (_content.company_sponsors = company_sponsors);
      fund_sponsors.length &&
        (await $refValidation({
          collection: 'funds',
          list: fund_sponsors,
          Refname: 'fund_sponsors',
        })) &&
        (_content.fund_sponsors = fund_sponsors);
      person_sponsors.length &&
        (await $refValidation({
          collection: 'persons',
          list: person_sponsors,
          Refname: 'person_sponsors',
        })) &&
        (_content.person_sponsors = person_sponsors);
      const event = await this.model.update($toMongoFilter({ _id }), {
        $set: {
          ..._content,
          ...(_subject && { updated_by: _subject }),
        },
      });
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
      await this.model.delete($toMongoFilter({ _id }), {
        ...(_subject && { deleted_by: _subject }),
      });
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
            $limit: 1,
          },
          {
            $addFields: this.model.$addFields.categories,
          },
          this.model.$lookups.categories,
          this.model.$lookups.speakers,
          this.model.$lookups.company_sponsors,
          this.model.$lookups.fund_sponsors,
          this.model.$lookups.person_sponsors,
          this.model.$lookups.country,
          this.model.$sets.country,
          this.model.$lookups.author,
          this.model.$sets.author,
          ...((lang && [
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
          ]) ||
            []),
          ...((lang && [this.model.$sets.trans]) || []),
          ...((lang && [
            {
              $project: {
                ...$keysToProject(this.outputKeys),
                ...(lang && $keysToProject(this.transKeys, '$trans')),
              },
            },
          ]) ||
            []),
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
            $limit: 1,
          },
          {
            $addFields: this.model.$addFields.categories,
          },
          this.model.$lookups.categories,
          this.model.$lookups.speakers,
          this.model.$lookups.company_sponsors,
          this.model.$lookups.fund_sponsors,
          this.model.$lookups.person_sponsors,
          this.model.$lookups.country,
          this.model.$sets.country,
          this.model.$lookups.author,
          this.model.$sets.author,
          ...((lang && [
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
          ]) ||
            []),
          ...((lang && [this.model.$sets.trans]) || []),
          ...((lang && [
            {
              $project: {
                ...$keysToProject(this.outputKeys),
                ...(lang && $keysToProject(this.transKeys, '$trans')),
              },
            },
          ]) ||
            []),
        ])
        .toArray();
      if (isNil(item)) throwErr(new EventError('EVENT_NOT_FOUND'));
      this.logger.debug('get_success', { _slug });
      return _permission == 'private' ? toOutPut({ item }) : omit(toOutPut({ item }), PRIVATE_KEYS);
    } catch (err) {
      this.logger.error('get_error', err.message);
      throw err;
    }
  }

  async getRelated({ _filter, _query }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { categories = [], lang, ...otherFilter } = _filter;
      const { limit, offset, sort_order, keyword } = _query;
      const [
        {
          total_count: [{ total_count } = { total_count: 0 }],
          items,
        },
      ] = await this.model
        .get([
          {
            $match: {
              ...$toMongoFilter({
                ...otherFilter,
                ...(categories.length && {
                  $or: [{ categories: { $in: categories } }],
                }),
                // start_date: { $gte: new Date() },
                ...(keyword && {
                  $or: [{ name: { $regex: keyword, $options: 'i' } }],
                }),
                ...(lang && {
                  'trans.lang': { $eq: lang },
                }),
              }),
            },
          },

          {
            $facet: {
              total_count: [{ $count: 'total_count' }],
              items: [
                { $skip: +offset },
                { $limit: +limit },

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
                ...((lang && [this.model.$sets.trans]) || []),
                {
                  $project: {
                    ...$keysToProject(this.publicOutputKeys),
                    ...(lang && $keysToProject(this.transKeys, '$trans')),
                  },
                },
                { $sort: { start_date: sort_order === 'asc' ? 1 : -1 } },
              ],
            },
          },
        ])
        .toArray();
      this.logger.debug('get_success', { total_count, items });
      return toPagingOutput({
        items,
        total_count,
        has_next: total_count > offset + limit,
        keys: this.publicOutputKeys,
      });
    } catch (err) {
      this.logger.error('get_error', err.message);
      throw err;
    }
  }
  async getTrending({ _query, _filter }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { lang } = _filter;
      const { offset, limit, sort_order } = _query;
      const [
        {
          total_count: [{ total_count } = { total_count: 0 }],
          trending,
          virtual,
        },
      ] = await this.model
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
            $facet: {
              total_count: [{ $count: 'total_count' }],
              trending: [
                { $match: { trending: true } },
                { $limit: +limit },

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
                ...((lang && [this.model.$sets.trans]) || []),
                this.model.$lookups.country,
                this.model.$sets.country,
                {
                  $project: {
                    ...$keysToProject(this.publicOutputKeys),
                    ...(lang && $keysToProject(this.transKeys, '$trans')),
                  },
                },
                { $sort: { start_date: sort_order === 'asc' ? 1 : -1 } },
              ],
              virtual: [
                { $match: { type: 'virtual' } },
                { $limit: +limit },

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
                ...((lang && [this.model.$sets.trans]) || []),
                this.model.$lookups.country,
                this.model.$sets.country,
                {
                  $project: {
                    ...$keysToProject(this.publicOutputKeys),
                    ...(lang && $keysToProject(this.transKeys, '$trans')),
                  },
                },
                { $sort: { start_date: sort_order === 'asc' ? 1 : -1 } },
              ],
            },
          },
        ])
        .toArray();
      const items = [...trending, ...virtual];
      this.logger.debug('get_success', { total_count, items });
      return toPagingOutput({
        items,
        total_count,
        has_next: total_count > offset + limit,
        keys: this.publicOutputKeys,
      });
    } catch (err) {
      this.logger.error('get_error', err.message);
      throw err;
    }
  }
  async getSignificant({ _query, _filter }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { lang } = _filter;
      const { limit, offset, sort_order, keyword } = _query;
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
            $facet: {
              total_count: [{ $count: 'total_count' }],
              items: [
                { $skip: +offset },
                { $limit: +limit },

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
                ...((lang && [this.model.$sets.trans]) || []),
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
              ],
            },
          },
        ])
        .toArray()) as any[];

      this.logger.debug('get_success', { total_count, items });
      return toPagingOutput({
        items,
        total_count,
        has_next: total_count > offset + limit,
        keys: this.publicOutputKeys,
      });
    } catch (err) {
      this.logger.error('get_error', err.message);
      throw err;
    }
  }
  /**
   *  Query Event
   * @param {any} _filter
   * @param {BaseQuery} _query
   * @returns {Promise<BaseServiceOutput>}
   *
   **/
  async query({ _filter, _query, _permission = 'public' }: BaseServiceInput): Promise<BaseServiceOutput> {
    try {
      const { categories = [], lang, start_date, end_date, type, country, deleted = false } = _filter;
      const { offset, limit, sort_by, sort_order, keyword } = _query;
      const [{ paging: [{ total_count = 0 } = {}] = [{ total_count: 0 }], items }] = await this.model
        .get([
          ...$pagination({
            $match: {
              ...((_permission === 'private' && {
                deleted,
              }) || {
                deleted: { $ne: true },
              }),
              ...(categories.length && {
                $or: [{ categories: { $in: categories } }],
              }),
              ...(keyword && {
                $or: [{ name: { $regex: keyword, $options: 'i' } }],
              }),
              ...(lang && {
                'trans.lang': { $eq: lang },
              }),
              ...(type && {
                type: Array.isArray(type) ? type : [type],
              }),
              ...(start_date && {
                start_date: {
                  $gte: new Date(start_date),
                },
              }),
              ...(end_date && {
                end_date: {
                  $gte: new Date(end_date),
                },
              }),
              ...((country && {
                country,
              }) ||
                {}),
            },
            $projects: [
              ...((lang && [
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
              ]) ||
                []),
            ],
            $addFields: this.model.$addFields.categories,
            $more: [
              ...((lang && [this.model.$sets.trans]) || []),
              this.model.$lookups.categories,
              this.model.$lookups.country,
              this.model.$sets.country,
              ...((lang && [
                {
                  $project: {
                    ...$keysToProject(this.outputKeys),
                    ...(lang && $keysToProject(this.transKeys, '$trans')),
                  },
                },
              ]) ||
                []),
            ],
            ...(sort_by && sort_order && { $sort: { [sort_by]: sort_order == 'asc' ? 1 : -1 } }),
            items: [{ $skip: (+offset - 1) * +limit }, { $limit: +limit }],
          }),
        ])
        .toArray();
      this.logger.debug('query_success', { total_count, _filter, _query });
      return toPagingOutput({
        items,
        total_count,
        has_next: total_count > offset + limit,
        keys: this.publicOutputKeys,
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
      const { lang } = _filter;
      const { offset, limit, sort_by, sort_order, keyword } = _query;
      const [{ paging: [{ total_count = 0 } = {}] = [{ total_count: 0 }], items }] = await this.model
        .get([
          ...$pagination({
            $match: {
              deleted: { $ne: true },
              ...(keyword && {
                $or: [{ $text: { $search: keyword } }, { name: { $regex: keyword, $options: 'i' } }],
              }),
              ...(lang && {
                'trans.lang': { $eq: lang },
              }),
            },
            $addFields: this.model.$addFields.categories,
            $lookups: [this.model.$lookups.author, this.model.$lookups.categories],
            $projects: [
              ...((lang && [
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
              ]) ||
                []),
            ],
            $more: [
              ...((lang && [this.model.$sets.trans]) || []),
              ...((lang && [
                {
                  $project: {
                    ...$keysToProject(this.outputKeys),
                    ...(lang && $keysToProject(this.transKeys, '$trans')),
                  },
                },
              ]) ||
                []),
            ],
            items: [{ $skip: (+offset - 1) * +limit }, { $limit: +limit }],
          }),
        ])
        .toArray();
      this.logger.debug('query_success', { total_count, _query, _filter });
      return toPagingOutput({
        items,
        total_count,
        has_next: total_count > offset + limit,
        keys: this.publicOutputKeys,
      });
    } catch (err) {
      this.logger.error('query_error', err.message);
      throw err;
    }
  }
}
