import { Inject, Service } from 'typedi';
import { Controller, Res, Post, Body, Get, Query } from '@/utils/expressDecorators';
import { Response } from 'express';
import { EventModel } from '@/models/event.model';
import httpStatusCode from 'http-status';
import EventService from './event.service';
import { Event, EventQuery } from './event.type';
import { Category } from '../category/category.type';
import { buildQueryFilter } from '@/utils/common';

@Service()
@Controller('/events')
export default class EventController {
  @Inject()
  private eventService: EventService;
  @Post('/', [])
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
      | 'location'
      | 'website'
      | 'categories'
      | 'country'
      | 'speakers'
      | 'sponsors'
    >,
  ) {
    const result = await this.eventService.create(body);
    res.status(httpStatusCode.CREATED).json({ data: result, _meta: body });
  }
  @Get('/related')
  async getRelated(@Res() res: Response, @Query() _query: Pick<EventQuery, 'category'>) {
    const { filter, query } = buildQueryFilter(_query);
    const result = await this.eventService.getRelated(filter, query);
    res.status(httpStatusCode.OK).json({ data: result, _meta: query });
  }
}
