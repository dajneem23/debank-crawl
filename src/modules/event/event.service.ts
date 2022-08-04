import { Service } from 'typedi';
import Logger from '@/core/logger';
import { AppDataSource } from '@/config/dbConfig';
import { isNull, omitBy, pick } from 'lodash';
import { EventModel } from '@/models/event.model';
import { EventError } from './event.error';
import { Event, EventQuery } from './event.type';
import { Category } from '../category/category.type';
import { BaseQuery, PaginationResult, trueSQL } from '@/types/Common';
import { EventResponse } from './event.type';
import { Brackets } from 'typeorm';
@Service()
export default class EventService {
  private logger = new Logger('eventService');
  private SIGNIFICANT_EVENT_CATEGORIES = ['conference', 'workshop', 'summit'];
  private OUTPUT_FIELDS = [
    'event.id',
    'event.type',
    'event.startDate',
    'event.endDate',
    'event.name',
    'event.introduction',
    'event.medias',
    'event.agenda',
    'event.socialProfiles',
    'event.map',
    'event.phone',
    'event.website',
    'event.country',
  ];
  private NUM_OF_EVENT = {
    TRENDING: 2,
    SIGNIFICANT: 3,
    VIRTUAL: 1,
    MAX: 3,
  };
  /**
   * Create Event
   * @param {Pick<EventModel, 'name' | 'introduction'| 'medias'| 'agenda'| 'socialProfiles'| 'map'| 'startDate'| 'endDate'| 'phone'| 'website'| 'categories'| 'country'| 'speakers'| 'sponsors'| 'cryptoAssetTags' >} body
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
      const queryData = await repository
        .createQueryBuilder('event')
        .leftJoinAndSelect('event.categories', 'category')
        .innerJoinAndSelect('event.cryptoAssetTags', 'crypto_asset_tag')
        .where(!!query.q ? 'event.name like :name' : trueSQL, { name: query.q })
        .andWhere(!!category ? 'category.id  = :category' : trueSQL, {
          category,
        })
        .andWhere(!!cryptoAssetTags ? 'crypto_asset_tag.id IN (:...cryptoAssetTags) ' : trueSQL, {
          cryptoAssetTags: Array.isArray(cryptoAssetTags) ? cryptoAssetTags : [cryptoAssetTags],
        })
        .andWhere('event.startDate > :now', { now })
        .select();
      const count = await queryData.getCount();
      const items = await queryData
        .orderBy('event.startDate', 'ASC')
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
   * @param {Pick<EventQuery,'country'>} filter
   * @returns {Promise<Array<EventModel>>}
   */
  async getTrendingEvent(
    filter: Pick<EventQuery, 'country'>,
    query: BaseQuery,
  ): Promise<PaginationResult<EventResponse>> {
    try {
      const repository = AppDataSource.getRepository(EventModel);
      const now = new Date();
      const [queryTrendingEvent, trendingCount] = await repository
        .createQueryBuilder('event')
        .leftJoinAndSelect('event.country', 'country', 'country.id = event.country')
        .innerJoinAndSelect('event.cryptoAssetTags', 'crypto_asset_tag')
        .where(!!query.q ? 'event.name like :name' : trueSQL, { name: query.q })
        .andWhere('event.startDate > :now', { now })
        .andWhere('crypto_asset_tag.name IN (:...tags) ', {
          tags: ['trending'],
        })
        .andWhere(!!filter.country ? 'country.id  = :country' : trueSQL, {
          country: filter.country,
        })
        .select(this.OUTPUT_FIELDS)
        .take(this.NUM_OF_EVENT.TRENDING)
        .orderBy('event.startDate', 'ASC')
        .getManyAndCount();
      const [queryVirtualEvent, virtualCount] = await repository
        .createQueryBuilder('event')
        .innerJoinAndSelect('event.cryptoAssetTags', 'crypto_asset_tag')
        .where(!!query.q ? 'event.name like :name' : trueSQL, { name: query.q })
        .andWhere('event.startDate > :now', { now })
        .andWhere('event.type = :type', { type: 'virtual' })
        .andWhere('crypto_asset_tag.name IN (:...tags) ', {
          tags: ['trending'],
        })
        .andWhere(!!queryTrendingEvent.length ? 'event.id NOT IN (:...trendingEvents) ' : trueSQL, {
          trendingEvents: queryTrendingEvent.map((item) => item.id),
        })
        .select(this.OUTPUT_FIELDS)
        .take(this.NUM_OF_EVENT.MAX - queryTrendingEvent.length)
        .orderBy('event.startDate', 'ASC')
        .getManyAndCount();
      const items = [...queryTrendingEvent, ...queryVirtualEvent];
      this.logger.debug('[query event:success]', { filter });
      return { totalCount: trendingCount + virtualCount, items };
    } catch (err) {
      this.logger.error('[query event:error]', err.message);
      throw err;
    }
  }

  /**
   * Get Significant event
   * @param {EventQuery} filter
   * @returns {Promise<Array<EventModel>>}
   */
  async getSignificantEvent(filter: EventQuery, query: BaseQuery): Promise<PaginationResult<EventResponse>> {
    try {
      const repository = AppDataSource.getRepository(EventModel);
      const now = new Date();
      const [events, count] = await repository
        .createQueryBuilder('event')
        // .innerJoinAndSelect('event.categories', 'category')
        .innerJoinAndSelect('event.cryptoAssetTags', 'crypto_asset_tag')
        .where(!!query.q ? 'event.name like :name' : trueSQL, { name: query.q })
        .andWhere('event.startDate > :now', { now })
        // .andWhere('category.name IN (:...categories)', {
        //   categories: [],
        // })
        .andWhere('crypto_asset_tag.name IN (:...tags) ', {
          tags: ['significant'],
        })
        .select(this.OUTPUT_FIELDS)
        .take(this.NUM_OF_EVENT.SIGNIFICANT)
        .getManyAndCount();
      this.logger.debug('[query event:success]', { filter });
      return { totalCount: count, items: events };
    } catch (err) {
      this.logger.error('[query event:error]', err.message);
      throw err;
    }
  }
}
