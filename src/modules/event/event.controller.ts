import Container, { Inject, Service } from 'typedi';
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
import { Event, EventFilter, EventService, eventServiceToken, EventValidation } from '.';
import { buildQueryFilter } from '@/utils/common';
import httpStatus from 'http-status';
import { protect, protectPrivateAPI } from '@/api/middlewares/protect';
import { JWTPayload } from '../auth/authSession.type';
import { BaseQuery, BaseServiceInput } from '@/types';
@Service()
@Controller('/events')
export class EventController {
  private service = Container.get(eventServiceToken);
  @Post('/', [protect(), EventValidation.create])
  async create(
    @Res() _res: Response,
    @Auth() _auth: JWTPayload,
    @Req() _req: Request,
    @Body()
    _body: Event,
  ) {
    const result = await this.service.create({
      _content: _body,
      _subject: _auth.id,
    } as BaseServiceInput);
    _res.status(httpStatus.CREATED).json(result);
  }
  @Put('/:id', [protect(), EventValidation.update])
  async update(
    @Res() _res: Response,
    @Auth() _auth: JWTPayload,
    @Req() _req: Request,
    @Body()
    _body: Event,
    @Params() _params: { id: string },
  ) {
    const result = await this.service.update({
      _id: _params.id,
      _subject: _auth.id,
      _content: _body,
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }
  @Get('/related', [EventValidation.getRelated])
  async getRelatedEvent(@Res() _res: Response, @Req() _req: Request, @Query() _query: EventFilter) {
    const { filter, query } = buildQueryFilter(_query);
    const result = await this.service.getRelatedEvent({ _filter: filter, _query: query } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }
  @Get('/trending', [EventValidation.getTrending])
  async getTrendingEvent(@Res() _res: Response, @Req() _req: Request, @Query() _query: EventFilter) {
    const { filter, query } = buildQueryFilter(_query);
    const result = await this.service.getTrendingEvent({ _filter: filter, _query: query } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }
  @Get('/significant', [EventValidation.getSignificant])
  async getSignificantEvent(@Res() _res: Response, @Req() _req: Request, @Query() _query: EventFilter) {
    const { filter, query } = buildQueryFilter(_query);
    const result = await this.service.getSignificantEvent({ _filter: filter, _query: query } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }
  @Get('/search', [EventValidation.search])
  async search(@Res() _res: Response, @Req() _req: Request, @Query() _query: BaseQuery) {
    const { filter, query } = buildQueryFilter(_query);
    const result = await this.service.search({
      _filter: filter,
      _query: query,
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }
  @Get('/:id', [EventValidation.getById])
  async getById(
    @Res() _res: Response,
    @Req() _req: Request,
    @Params()
    _params: {
      id: string;
    },
  ) {
    const result = await this.service.getById({
      _id: _params.id,
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }
  @Get('/', [EventValidation.query])
  async get(@Res() _res: Response, @Req() _req: Request, @Query() _query: BaseQuery) {
    const { filter, query } = buildQueryFilter(_query);
    const result = await this.service.query({
      _filter: filter,
      _query: query,
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }
  @Delete('/:id', [protectPrivateAPI(), EventValidation.deleteById])
  async delete(
    @Res() _res: Response,
    @Req() _req: Request,
    @Auth() _auth: JWTPayload,
    @Params() _params: { id: string },
  ) {
    await this.service.delete({
      _id: _params.id,
      _subject: _auth.id,
    } as BaseServiceInput);
    _res.status(httpStatus.NO_CONTENT).end();
  }

  @Patch('/:id/trending', [protectPrivateAPI(), EventValidation.updateTrending])
  async updateTrendingEvent(
    @Res() _res: Response,
    @Req() _req: Request,
    @Auth() _auth: JWTPayload,
    @Body()
    _body: {
      trending: boolean;
    },
    @Params() _params: { id: string },
  ) {
    const result = await this.service.update({
      _id: _params.id,
      _content: _body,
      subject: _auth.id,
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }

  @Patch('/:id/significant', [protectPrivateAPI(), EventValidation.updateSignificant])
  async updateSignificantEvent(
    @Res() _res: Response,
    @Req() _req: Request,
    @Auth() _auth: JWTPayload,
    @Body()
    _body: {
      significant: boolean;
    },
    @Params() _params: { id: string },
  ) {
    const result = await this.service.update({
      _id: _params.id,
      _content: _body,
      _subject: _auth.id,
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }
  @Patch('/:id/subscribe', [protectPrivateAPI(), EventValidation.subscribe])
  async subscribe(
    @Res() _res: Response,
    @Req() _req: Request,
    @Auth() _auth: JWTPayload,
    @Body()
    _body: {
      significant: boolean;
    },
    @Params() _params: { id: string },
  ) {
    const result = await this.service.subscribe({
      _id: _params.id,
      _content: _body,
      _subject: _auth.id,
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }
}
