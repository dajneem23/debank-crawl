import { Inject, Service } from 'typedi';
import {
  Controller,
  Res,
  Post,
  Body,
  Get,
  Query,
  Put,
  Params,
  Delete,
  Patch,
  Req,
  Auth,
} from '@/utils/expressDecorators';
import { Response } from 'express';
import { Event, EventFilter, EventService, EventInput, EventValidation } from '.';
import { buildQueryFilter } from '@/utils/common';
import httpStatus from 'http-status';
import { protect, protectPrivateAPI } from '@/api/middlewares/protect';
import { JWTPayload } from '../auth/authSession.type';
import { BaseQuery, BaseServiceInput } from '@/types';
@Service()
@Controller('/events')
export class EventController {
  @Inject()
  private eventService: EventService;
  @Post('/', [EventValidation.create, protect()])
  async create(
    @Res() _res: Response,
    @Auth() _auth: JWTPayload,
    @Req() _req: Request,
    @Body()
    body: Event,
  ) {
    const result = await this.eventService.create({
      _content: body,
      _subject: _auth.id,
    } as BaseServiceInput);
    _res.status(httpStatus.CREATED).json(result);
  }
  @Put('/:id', [EventValidation.update, protect()])
  async update(
    @Res() _res: Response,
    @Auth() _auth: JWTPayload,
    @Req() _req: Request,
    @Body()
    body: Event,
    @Params() params: { id: string },
  ) {
    const result = await this.eventService.update({
      _id: params.id,
      _subject: _auth.id,
      _content: body,
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }
  @Get('/related', [EventValidation.getRelated])
  async getRelatedEvent(@Res() _res: Response, @Req() _req: Request, @Query() _query: EventFilter) {
    const { filter, query } = buildQueryFilter(_query);
    const result = await this.eventService.getRelatedEvent({ _filter: filter, _query: query } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }
  @Get('/trending', [EventValidation.getTrending])
  async getTrendingEvent(@Res() _res: Response, @Req() _req: Request, @Query() _query: EventFilter) {
    const { filter, query } = buildQueryFilter(_query);
    const result = await this.eventService.getTrendingEvent({ _filter: filter, _query: query } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }
  @Get('/significant', [EventValidation.getSignificant])
  async getSignificantEvent(@Res() _res: Response, @Req() _req: Request, @Query() _query: EventFilter) {
    const { filter, query } = buildQueryFilter(_query);
    const result = await this.eventService.getSignificantEvent({ _filter: filter, _query: query } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }

  @Get('/:id', [EventValidation.getById])
  async getById(
    @Res() _res: Response,
    @Req() _req: Request,
    @Params()
    params: {
      id: string;
    },
  ) {
    const result = await this.eventService.getById({
      _id: params.id,
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }
  @Get('/', [EventValidation.query])
  async get(@Res() _res: Response, @Req() _req: Request, @Query() _query: BaseQuery) {
    const { filter, query } = buildQueryFilter(_query);
    const result = await this.eventService.query({
      _filter: filter,
      _query: query,
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }
  @Delete('/:id', [EventValidation.deleteById, protectPrivateAPI()])
  async delete(
    @Res() _res: Response,
    @Req() _req: Request,
    @Auth() _auth: JWTPayload,
    @Params() params: { id: string },
  ) {
    await this.eventService.delete({
      _id: params.id,
      _subject: _auth.id,
    } as BaseServiceInput);
    _res.status(httpStatus.NO_CONTENT).end();
  }

  @Patch('/:id/trending', [EventValidation.updateTrending, protectPrivateAPI()])
  async updateTrendingEvent(
    @Res() _res: Response,
    @Req() _req: Request,
    @Auth() _auth: JWTPayload,
    @Body()
    body: {
      trending: boolean;
    },
    @Params() params: { id: string },
  ) {
    const result = await this.eventService.update({
      _id: params.id,
      _content: {
        trending: body.trending,
      },
      subject: _auth.id,
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }

  @Patch('/:id/significant', [EventValidation.updateSignificant, protectPrivateAPI()])
  async updateSignificantEvent(
    @Res() _res: Response,
    @Req() _req: Request,
    @Auth() _auth: JWTPayload,
    @Body()
    body: {
      significant: boolean;
    },
    @Params() params: { id: string },
  ) {
    const result = await this.eventService.update({
      _id: params.id,
      _content: {
        significant: body.significant,
      },
      _subject: _auth.id,
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }
}
