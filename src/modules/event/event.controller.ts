import { Inject, Service } from 'typedi';
import { Controller, Res, Post, Body, Get, Query, Put, Params } from '@/utils/expressDecorators';
import { Response } from 'express';
import { Event, EventQuery, EventService, EventInput } from '.';
import * as EventValidation from './event.validation';
import { buildQueryFilter } from '@/utils/common';
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
    res.status(result.code).json(result);
  }
  @Put('/:id')
  async update(
    @Res() res: Response,
    @Body()
    body: Event,
    @Params() params: { id: string },
  ) {
    const result = await this.eventService.update({
      updateEvent: {
        data: body,
        id: params.id,
      },
    } as EventInput);
    res.status(result.code).json(result);
  }
  // @Get('/related', [EventValidation.getRelated])
  // async queryRelatedEvent(@Res() res: Response, @Query() _query: Pick<EventQuery, 'category' | 'cryptoAssetTags'>) {}

  // @Get('/trending', [EventValidation.query])
  // async queryTrendingEvent(@Res() res: Response, @Query() _query: Pick<EventQuery, 'country'>) {}

  // @Get('/significant', [EventValidation.query])
  // async querySignificantEvent(@Res() res: Response, @Query() _query: EventQuery) {}
}
