import Container from 'typedi';
import { Controller, Res, Post, Body, Get, Query, Put, Params, Delete, Req, Auth } from '@/utils/expressDecorators';
import { Request, Response } from 'express';
import { Glossary, GlossaryServiceToken, GlossaryValidation } from '.';
import { buildQueryFilter } from '@/utils/common';
import httpStatus from 'http-status';
import { protect, protectPrivateAPI } from '@/api/middlewares/protect';
import { JWTPayload } from '../auth/authSession.type';
import { BaseQuery, BaseServiceInput } from '@/types/Common';
import { getPermission } from '../auth/auth.utils';
@Controller('/glossaries')
export class GlossaryController {
  private service = Container.get(GlossaryServiceToken);

  @Post('/', [protectPrivateAPI(), GlossaryValidation.create])
  async create(
    @Res() _res: Response,
    @Auth() _auth: JWTPayload,
    @Req() _req: Request,
    @Body()
    _body: Glossary,
  ) {
    const result = await this.service.create({
      _content: _body,
      _subject: _auth.id,
    } as BaseServiceInput);
    _res.status(httpStatus.CREATED).json(result);
  }

  @Put('/:id', [protectPrivateAPI(), GlossaryValidation.update])
  async update(
    @Res() _res: Response,
    @Auth() _auth: JWTPayload,
    @Req() _req: Request,
    @Params() _params: { id: string },
    @Body()
    _body: Glossary,
  ) {
    const result = await this.service.update({
      _id: _params.id,
      _content: _body,
      _subject: _auth.id,
    } as BaseServiceInput);
    _res.status(httpStatus.CREATED).json(result);
  }

  @Delete('/:id', [protectPrivateAPI(), GlossaryValidation.delete])
  async delete(
    @Res() _res: Response,
    @Auth() _auth: JWTPayload,
    @Req() _req: Request,
    @Params() _params: { id: string },
    @Body()
    _body: Glossary,
  ) {
    await this.service.delete({
      _id: _params.id,
      _content: _body,
      _subject: _auth.id,
    } as BaseServiceInput);
    _res.status(httpStatus.NO_CONTENT).end();
  }
  @Get('/', [
    protect({
      ignoreException: true,
    }),
    GlossaryValidation.query,
  ])
  async getByUser(@Res() _res: Response, @Req() _req: Request, @Query() _query: BaseQuery, @Auth() _auth: JWTPayload) {
    const { filter, query } = buildQueryFilter(_query);
    const result = await this.service.query({
      _filter: filter,
      _query: query,
      _permission: getPermission(_auth.roles),
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }
  @Get('/search', [GlossaryValidation.search])
  async search(@Res() _res: Response, @Req() _req: Request, @Query() _query: BaseQuery) {
    const { filter, query } = buildQueryFilter(_query);
    const result = await this.service.search({
      _filter: filter,
      _query: query,
      _permission: 'public',
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }
  // @Get('/:id', [GlossaryValidation.getById])
  // async getByIdPublic(
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
  @Get('/:slug', [GlossaryValidation.getBySlug])
  async getBySlugPublic(
    @Res() _res: Response,
    @Req() _req: Request,
    @Query() _query: BaseQuery,
    @Params()
    _params: {
      slug: string;
    },
  ) {
    const { filter, query } = buildQueryFilter(_query);
    const result = await this.service.getBySlug({
      _slug: _params.slug,
      _filter: filter,
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }
}
@Controller('/private/glossaries')
export class GlossaryPrivateController {
  private service = Container.get(GlossaryServiceToken);

  @Get('/', [protectPrivateAPI(), GlossaryValidation.query])
  async getByAdmin(@Res() _res: Response, @Req() _req: Request, @Query() _query: BaseQuery) {
    const { filter, query } = buildQueryFilter(_query);
    const result = await this.service.query({
      _filter: filter,
      _query: query,
      _permission: 'private',
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }

  @Get('/:id', [protectPrivateAPI(), GlossaryValidation.getById])
  async getByIdPrivate(
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
      _permission: 'private',
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }
}
