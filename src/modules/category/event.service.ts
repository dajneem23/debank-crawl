import { Service } from 'typedi';
import Logger from '@/core/logger';
import { AppDataSource } from '@/config/dbConfig';
import { isNull, omitBy, pick } from 'lodash';
import { EventModel } from '@/models/event.model';
import { EventError } from '../event/event.error';
import { Event, EventQuery } from '../event/event.type';
import { Category } from './category.type';
import { BaseQuery, PaginationResult } from '@/types/Common';
import { EventResponse } from '../event/event.type';
import { Brackets } from 'typeorm';
@Service()
export default class EventService {
  private logger = new Logger('eventService');
  private MONTH_RANGE = 6;
  private SIGNIFICANT_EVENT_CATEGORIES = ['conference', 'workshop', 'summit'];
  /**
   * Create Event
   * @param {Pick<EventModel, 'name' | 'introduction'| 'medias'| 'agenda'| 'socialProfiles'| 'map'| 'startDate'| 'endDate'| 'phone'| 'location'| 'website'| 'categories'| 'country'| 'speakers'| 'sponsors'| 'cryptoAssetTags' >} body
   * @returns {Promise<Event>}
   * Create event and save to database
   */
  async create(
    body: Pick<
      Event,
      | 'name'
      | 'introduction'
      | 'medias'
      | 'agenda'
      | 'socialProfiles'
      | 'map'
      | 'startDate'
      | 'endDate'
      | 'phone'
      | 'location'
      | 'website'
      | 'categories'
      | 'country'
      | 'speakers'
      | 'sponsors'
      | 'cryptoAssetTags'
    >,
  ): Promise<Event> {
    try {
      // event repository
      const eventRepository = AppDataSource.getRepository(EventModel);
      const event = await eventRepository.create({
        ...body,
        createdAt: new Date(),
      });
      // Create relationship and save
      const eventSaved = await eventRepository.save(event);
      this.logger.debug('[Create event: success]', { eventSaved, body });
      return omitBy(eventSaved, isNull);
    } catch (err) {
      this.logger.error('[Create event: error]', err.message);
      throw err;
    }
  }

  /**
   * Get related event by category and crypto asset tags in range of 6 months
   * @param {Pick<EventQuery,'category' | 'cryptoAssetTags'  >} filter
   * @returns {Promise<Array<EventModel>>}
   */
  async getRelatedEvent(
    filter: Pick<EventQuery, 'category' | 'cryptoAssetTags'>,
    query: BaseQuery,
  ): Promise<PaginationResult<EventResponse>> {
    try {
      const { category, cryptoAssetTags } = filter;
      const repository = AppDataSource.getRepository(EventModel);
      const now = new Date();
      const monthRange = new Date(now.getFullYear(), now.getMonth() + this.MONTH_RANGE, now.getDate());
      const trueSQL = '1 = 1';
      const queryData = await repository
        .createQueryBuilder('event')
        .leftJoinAndSelect('event.categories', 'category')
        .innerJoinAndSelect('event.cryptoAssetTags', 'crypto_asset_tag')
        .where(!!query.q ? 'event.name like :name' : trueSQL, { name: query.q })
        .andWhere(!!category ? 'category.id  = :category' : trueSQL, {
          category,
        })
        .andWhere(!!cryptoAssetTags ? 'crypto_asset_tag.id  IN (:...cryptoAssetTags) ' : trueSQL, {
          cryptoAssetTags,
        })
        .andWhere('event.startDate > :now', { now })
        .andWhere('event.startDate < :monthRange', {
          monthRange,
        })
        .select([
          'event.id',
          'event.type',
          'event.trending',
          'event.significant',
          'event.startDate',
          'event.endDate',
          'event.name',
          'event.introduction',
          'event.medias',
          'event.agenda',
          'event.socialProfiles',
          'event.map',
          'event.phone',
          'event.location',
          'event.website',
          'event.country',
        ]);
      const count = await queryData.getCount();
      const items = await queryData
        .orderBy('event.startDate', query.sortOrder)
        .skip((query.page - 1) * query.perPage)
        .take(query.perPage)
        .getMany();
      this.logger.debug('[query event:success]', { filter });
      return { totalCount: count, items };
    } catch (err) {
      this.logger.error('[query event:error]', err.message);
      throw err;
    }
  }

  /**
   * Get Trending event
   * @param {Pick<EventQuery,'location'>} filter
   * @returns {Promise<Array<EventModel>>}
   */
  async getTrendingEvent(
    filter: Pick<EventQuery, 'location'>,
    query: BaseQuery,
  ): Promise<PaginationResult<EventResponse>> {
    try {
      const repository = AppDataSource.getRepository(EventModel);
      const now = new Date();
      const trueSQL = '1 = 1';
      const queryData = await repository
        .createQueryBuilder('event')
        .where(!!query.q ? 'event.name like :name' : trueSQL, { name: query.q })
        .andWhere('event.startDate > :now', { now })
        .andWhere('event.trending = :trending', { trending: true })
        .andWhere(
          !!filter.location
            ? new Brackets((qb) => {
                qb.where('event.location = :location', { location: filter.location }).orWhere('event.type = :type', {
                  type: 'virtual',
                });
              })
            : trueSQL,
        )
        .select([
          'event.id',
          'event.type',
          'event.trending',
          'event.significant',
          'event.startDate',
          'event.endDate',
          'event.name',
          'event.introduction',
          'event.medias',
          'event.agenda',
          'event.socialProfiles',
          'event.map',
          'event.phone',
          'event.location',
          'event.website',
          'event.country',
        ]);
      const count = await queryData.getCount();
      const items = await queryData
        .skip((query.page - 1) * query.perPage)
        .take(query.perPage)
        .getMany();
      this.logger.debug('[query event:success]', { filter });
      return { totalCount: count, items };
    } catch (err) {
      this.logger.error('[query event:error]', err.message);
      throw err;
    }
  }

  /**
   * Get Significant event
   * @param {Pick<EventQuery,'significant' >} filter
   * @returns {Promise<Array<EventModel>>}
   */
  async getSignificantEvent(filter: EventQuery, query: BaseQuery): Promise<PaginationResult<EventResponse>> {
    try {
      const repository = AppDataSource.getRepository(EventModel);
      const now = new Date();
      const trueSQL = '1 = 1';
      const queryData = await repository
        .createQueryBuilder('event')
        .where(!!query.q ? 'event.name like :name' : trueSQL, { name: query.q })
        .andWhere('event.startDate > :now', { now })
        .andWhere('event.significant = :significant', { significant: true })
        // .innerJoinAndSelect('event.categories', 'category', 'category.id  IN (:...categories)', {
        //   categories,
        // })
        .select([
          'event.id',
          'event.type',
          'event.trending',
          'event.significant',
          'event.startDate',
          'event.endDate',
          'event.name',
          'event.introduction',
          'event.medias',
          'event.agenda',
          'event.socialProfiles',
          'event.map',
          'event.phone',
          'event.location',
          'event.website',
          'event.country',
        ]);
      const count = await queryData.getCount();
      const items = await queryData
        .skip((query.page - 1) * query.perPage)
        .take(query.perPage)
        .getMany();
      this.logger.debug('[query event:success]', { filter });
      return { totalCount: count, items };
    } catch (err) {
      this.logger.error('[query event:error]', err.message);
      throw err;
    }
  }
}
