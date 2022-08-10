import { Inject, Service } from 'typedi';
import { Controller, Res, Post, Body, Get, Query, Put, Params, Delete } from '@/utils/expressDecorators';
import { Response } from 'express';
import { Event, EventFilter, EventService, EventInput } from '.';
import * as EventValidation from './event.validation';
import { buildQueryFilter } from '@/utils/common';
import httpStatus from 'http-status';
@Service()
@Controller('/events')
export class EventController {
  @Inject()
  private eventService: EventService;
  @Post('/', [EventValidation.create])
  async create(
    @Res() res: Response,
    @Body()
    body: Event,
  ) {
    const result = await this.eventService.create({
      newEvent: body,
    } as EventInput);
    res.status(httpStatus.CREATED).json(result);
  }
  @Put('/:id')
  async update(
    @Res() res: Response,
    @Body()
    body: Event,
    @Params() params: { id: string },
  ) {
    const result = await this.eventService.update({
      _id: params.id,
      updateEvent: {
        data: body,
      },
    } as EventInput);
    res.status(httpStatus.OK).json(result);
  }
  @Get('/related', [EventValidation.queryRelated])
  async queryRelatedEvent(@Res() res: Response, @Query() _query: EventFilter) {
    const { filter, query } = buildQueryFilter(_query);
    const result = await this.eventService.queryRelatedEvent({ filter, query } as EventInput);
    res.status(httpStatus.OK).json(result);
  }
  @Get('/trending')
  async queryTrendingEvent(@Res() res: Response, @Query() _query: EventFilter) {
    const { filter, query } = buildQueryFilter(_query);
    const result = await this.eventService.queryTrendingEvent({ filter, query } as EventInput);
    res.status(httpStatus.OK).json(result);
  }
  @Get('/significant')
  async querySignificantEvent(@Res() res: Response, @Query() _query: EventFilter) {
    const { filter, query } = buildQueryFilter(_query);
    const result = await this.eventService.querySignificantEvent({ filter, query } as EventInput);
    res.status(httpStatus.OK).json(result);
  }
  @Get('/:id')
  async getById(
    @Res() res: Response,
    @Params()
    params: {
      id: string;
    },
  ) {
    const result = await this.eventService.getById({
      _id: params.id,
    } as EventInput);
    res.status(httpStatus.OK).json(result);
  }
  @Delete('/:id')
  async delete(@Res() res: Response, @Params() params: { id: string }) {
    const result = await this.eventService.delete({
      _id: params.id,
    } as EventInput);
    res.status(httpStatus.OK).json(result);
  }

  // @Get('/trending', [EventValidation.query])
  // async queryTrendingEvent(@Res() res: Response, @Query() _query: Pick<EventQuery, 'country'>) {}

  // @Get('/significant', [EventValidation.query])
  // async querySignificantEvent(@Res() res: Response, @Query() _query: EventQuery) {}
}
