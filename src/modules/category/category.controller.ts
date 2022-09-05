import { Inject, Service } from 'typedi';
import { Controller, Res, Post, Body, Get, Query, Put, Params, Delete, Req, Auth } from '@/utils/expressDecorators';
import { Response } from 'express';
import { Category, CategoryService, CategoryValidation } from '.';
import { buildQueryFilter } from '@/utils/common';
import httpStatus from 'http-status';
import { protectPrivateAPI } from '@/api/middlewares/protect';
import { JWTPayload } from '../auth/authSession.type';
import { BaseQuery, BaseServiceInput } from '@/types/Common';
@Service()
@Controller('/categories')
export class CategoryController {
  @Inject()
  private service: CategoryService;

  @Post('/', [CategoryValidation.create, protectPrivateAPI()])
  async create(
    @Res() _res: Response,
    @Auth() _auth: JWTPayload,
    @Req() _req: Request,
    @Body()
    body: Category,
  ) {
    const result = await this.service.create({
      _content: body,
      _subject: _auth.id,
    } as BaseServiceInput);
    _res.status(httpStatus.CREATED).json(result);
  }

  @Put('/:id', [CategoryValidation.update, protectPrivateAPI()])
  async update(
    @Res() _res: Response,
    @Auth() _auth: JWTPayload,
    @Req() _req: Request,
    @Params() params: { id: string },
    @Body()
    body: Category,
  ) {
    const result = await this.service.update({
      _id: params.id,
      _content: body,
      _subject: _auth.id,
    } as BaseServiceInput);
    _res.status(httpStatus.CREATED).json(result);
  }

  @Delete('/:id', [CategoryValidation.delete, protectPrivateAPI()])
  async delete(
    @Res() _res: Response,
    @Auth() _auth: JWTPayload,
    @Req() _req: Request,
    @Params() params: { id: string },
    @Body()
    body: Category,
  ) {
    const result = await this.service.delete({
      _id: params.id,
      _content: body,
      _subject: _auth.id,
    } as BaseServiceInput);
    _res.status(httpStatus.NO_CONTENT).end();
  }
  @Get('/', [CategoryValidation.query])
  async get(@Res() _res: Response, @Req() _req: Request, @Query() _query: BaseQuery) {
    const { filter, query } = buildQueryFilter(_query);
    const result = await this.service.query({
      _filter: filter,
      _query: query,
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }

  @Get('/search', [CategoryValidation.search])
  async search(@Res() _res: Response, @Req() _req: Request, @Query() _query: BaseQuery) {
    const { filter, query } = buildQueryFilter(_query);
    const result = await this.service.search({
      _filter: filter,
      _query: query,
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }

  @Get('/:id', [CategoryValidation.getById])
  async getById(
    @Res() _res: Response,
    @Req() _req: Request,
    @Query() _query: BaseQuery,
    @Params()
    _params: {
      id: string;
    },
  ) {
    const { filter, query } = buildQueryFilter(_query);

    const result = await this.service.getById({
      _id: _params.id,
      _filter: filter,
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }
}
