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
   * @param {Pick<EventModel, 'name' | 'introduction' | 'medias' | agenda | socialProfiles| map| startDate| endDate | phone | location >} body
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
   * Get Related Event
   * @param {Pick<EventQuery, 'category'>} filter
   * @returns {Promise<Array<EventModel>>}
   * Get 3 related event by category sort by start date
   */
  async getRelated(filter: Pick<EventQuery, 'category'>, query: BaseQuery): Promise<PaginationResult<EventResponse>> {
    try {
      const repository = AppDataSource.getRepository(EventModel);
      const now = new Date();
      // Get event in range 6 month
      const monthRange = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate());
      const queryData = await repository
        .createQueryBuilder('event')
        .leftJoinAndSelect('event.categories', 'category', 'category.id  = :categories', {
          categories: filter.category,
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
          // 'event.categories',
          'event.country',
          // 'event.speakers',
          // 'event.sponsors',
        ])
        .andWhere('event.startDate > :now', { now })
        .andWhere('event.startDate < :monthRange', { monthRange: monthRange });
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
}
