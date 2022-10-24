import Container from 'typedi';
import { Controller, Res, Post, Body, Get, Query, Put, Params, Delete, Req, Auth } from '@/utils/expressDecorators';
import { Request, Response } from 'express';
import { Category, CategoryValidation, categoryServiceToken } from '.';
import { buildQueryFilter } from '@/utils/common';
import httpStatus from 'http-status';
import { protect, protectPrivateAPI } from '@/api/middlewares/protect';
import { JWTPayload } from '../auth/authSession.type';
import { BaseQuery, BaseServiceInput } from '@/types/Common';
import { getPermission } from '../auth/auth.utils';
@Controller('/categories')
export class CategoryController {
  private service = Container.get(categoryServiceToken);

  @Get('/', [
    protect({
      ignoreException: true,
    }),
    CategoryValidation.query,
  ])
  async get(@Res() _res: Response, @Req() _req: Request, @Query() _query: BaseQuery, @Auth() _auth: JWTPayload) {
    const { filter, query } = buildQueryFilter(_query);
    const result = await this.service.query({
      _filter: filter,
      _query: query,
      _permission: getPermission(_auth.roles),
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
  @Get('/:name', [CategoryValidation.getByName])
  async getByName(
    @Res() _res: Response,
    @Req() _req: Request,
    @Query() _query: BaseQuery,
    @Params()
    _params: {
      name: string;
    },
  ) {
    const { filter, query } = buildQueryFilter(_query);

    const result = await this.service.getByName({
      _name: _params.name,
      _filter: filter,
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }
}
@Controller('/categories')
export class CategoryPrivateController {
  private service = Container.get(categoryServiceToken);

  @Post('/', [CategoryValidation.create])
  async create(
    @Res() _res: Response,
    @Auth() _auth: JWTPayload,
    @Req() _req: Request,
    @Body()
    _body: Category,
  ) {
    const result = await this.service.create({
      _content: _body,
      _subject: _auth.id,
    } as BaseServiceInput);
    _res.status(httpStatus.CREATED).json(result);
  }

  @Put('/:id', [CategoryValidation.update])
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

  @Delete('/:id', [CategoryValidation.delete])
  async delete(
    @Res() _res: Response,
    @Auth() _auth: JWTPayload,
    @Req() _req: Request,
    @Params() _params: { id: string },
    @Body()
    body: Category,
  ) {
    await this.service.delete({
      _id: _params.id,
      _content: body,
      _subject: _auth.id,
    } as BaseServiceInput);
    _res.status(httpStatus.NO_CONTENT).end();
  }

  @Get('/:id', [CategoryValidation.getById])
  async getByIdPrivate(
    @Res() _res: Response,
    @Req() _req: Request,
    @Query() _query: BaseQuery,
    @Params()
    _params: {
      id: string;
    },
  ) {
    const { filter } = buildQueryFilter(_query);

    const result = await this.service.getById({
      _id: _params.id,
      _filter: filter,
      _permission: 'private',
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }

  @Get('/:id/public', [CategoryValidation.getById])
  async publicCategory(
    @Res() _res: Response,
    @Req() _req: Request,
    @Query() _query: BaseQuery,
    @Params()
    _params: {
      id: string;
    },
  ) {
    const result = await this.service.publicCategory({
      _id: _params.id,
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }
}
