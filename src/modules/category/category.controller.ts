import Container from 'typedi';
import { Controller, Res, Post, Body, Get, Query, Put, Params, Delete, Req, Auth } from '@/utils/expressDecorators';
import { Request, Response } from 'express';
import { Category, CategoryValidation, categoryServiceToken } from '.';
import { buildQueryFilter } from '@/utils/common';
import httpStatus from 'http-status';
import { protectPrivateAPI } from '@/api/middlewares/protect';
import { JWTPayload } from '../auth/authSession.type';
import { BaseQuery, BaseServiceInput } from '@/types/Common';
@Controller('/categories')
export class CategoryController {
  private service = Container.get(categoryServiceToken);

  @Post('/', [protectPrivateAPI(), CategoryValidation.create])
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

  @Put('/:id', [protectPrivateAPI(), CategoryValidation.update])
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

  @Delete('/:id', [protectPrivateAPI(), CategoryValidation.delete])
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
  // @Get('/:id', [CategoryValidation.getById])
  // async getById(
  //   @Res() _res: Response,
  //   @Req() _req: Request,
  //   @Query() _query: BaseQuery,
  //   @Params()
  //   _params: {
  //     id: string;
  //   },
  // ) {
  //   const { filter, query } = buildQueryFilter(_query);

  //   const result = await this.service.getById({
  //     _id: _params.id,
  //     _filter: filter,
  //   } as BaseServiceInput);
  //   _res.status(httpStatus.OK).json(result);
  // }
  @Get('/:name', [CategoryValidation.getByName])
  async getById(
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
  @Get('/private/:name', [CategoryValidation.getByName])
  async getByIdPrivate(
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
      _permission: 'private',
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }
}
