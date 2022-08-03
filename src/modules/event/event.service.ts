import { Service } from 'typedi';
import Logger from '@/core/logger';
import { AppDataSource } from '@/config/dbConfig';
import { isNull, omitBy, pick } from 'lodash';
import { EventModel } from '@/models/event.model';
import { EventError } from './event.error';
import { Event, EventQuery } from './event.type';
import { Category } from '../category/category.type';
import { BaseQuery, PaginationResult } from '@/types/Common';
import { EventResponse } from './event.type';
@Service()
export default class EventService {
  private logger = new Logger('eventService');
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
      return eventSaved;
    } catch (err) {
      this.logger.error('[Create event: error]', err.message);
      throw err;
    }
  }

  /**
   * Query Event
   * @param {Pick<EventQuery, 'category'>} filter
   * @returns {Promise<Array<EventModel>>}
   * Get 3 related event by category sort by start date
   */
  async query(
    filter: Pick<EventQuery, 'name' | 'category' | 'cryptoAssetTags' | 'monthRange' | 'related'>,
    query: BaseQuery,
  ): Promise<PaginationResult<EventResponse>> {
    try {
      const repository = AppDataSource.getRepository(EventModel);
      const now = new Date();
      const queryData = await repository
        .createQueryBuilder('event')
        .leftJoinAndSelect('event.categories', 'category')
        .innerJoinAndSelect('event.cryptoAssetTags', 'crypto_asset_tag')
        .where(!!filter.name ? 'event.name like :name' : '1 = 1', { name: `%${filter.name}%` })
        .andWhere(!!filter.category ? 'category.id  = :categories' : '1 = 1', {
          categories: filter.category,
        })
        .andWhere(!!filter.cryptoAssetTags ? 'crypto_asset_tag.id  IN (:...cryptoAssetTags) ' : '1 = 1', {
          cryptoAssetTags: filter.cryptoAssetTags,
        })
        .andWhere(!!filter.related ? 'event.startDate > :now' : '1 = 1', { now })
        .andWhere(!!filter.monthRange ? 'event.startDate < :monthRange' : '1 = 1', {
          monthRange: new Date(
            now.getFullYear(),
            !isNaN(+filter.monthRange) ? now.getMonth() + filter.monthRange : now.getMonth(),
            now.getDate(),
          ),
        })
        .select([
          'event.id',
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
        .orderBy(query.sortBy, query.sortOrder)
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
