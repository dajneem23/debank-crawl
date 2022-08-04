import { Inject, Service } from 'typedi';
import { Controller, Res, Post, Body, Get, Query } from '@/utils/expressDecorators';
import { Response } from 'express';
import { EventModel } from '@/models/event.model';
import httpStatusCode from 'http-status';
import EventService from './event.service';
import { Event, EventQuery } from './event.type';
import { Category } from '../category/category.type';
import { buildQueryFilter } from '@/utils/common';
import * as eventValidation from './event.validation';
@Service()
@Controller('/events')
export default class EventController {
  @Inject()
  private eventService: EventService;
  @Post('/', [eventValidation.create])
  async create(
    @Res() res: Response,
    @Body()
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
  ) {
    const result = await this.eventService.create(body);
    res.status(httpStatusCode.CREATED).json({ data: result });
  }
  @Get('/related', [eventValidation.getRelated])
  async queryRelatedEvent(@Res() res: Response, @Query() _query: Pick<EventQuery, 'category' | 'cryptoAssetTags'>) {
    const { filter, query } = buildQueryFilter(_query);
    const result = await this.eventService.getRelatedEvent(filter, query);
    res.status(httpStatusCode.OK).json({ data: result });
  }

  @Get('/trending', [eventValidation.query])
  async queryTrendingEvent(@Res() res: Response, @Query() _query: Pick<EventQuery, 'country'>) {
    const { filter, query } = buildQueryFilter(_query);
    const result = await this.eventService.getTrendingEvent(filter, query);
    res.status(httpStatusCode.OK).json({ data: result });
  }

  @Get('/significant', [eventValidation.query])
  async querySignificantEvent(@Res() res: Response, @Query() _query: EventQuery) {
    const { filter, query } = buildQueryFilter(_query);
    const result = await this.eventService.getSignificantEvent(filter, query);
    res.status(httpStatusCode.OK).json({ data: result });
  }
}
