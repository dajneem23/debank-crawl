import Container from 'typedi';
import { Controller, Res, Post, Body, Get, Query, Put, Params, Delete, Req, Auth } from '@/utils/expressDecorators';
import { Request, Response } from 'express';
import { AssetTrending, assetTrendingServiceToken } from '.';
import { buildQueryFilter } from '@/utils/common';
import httpStatus from 'http-status';
import { protect, protectPrivateAPI } from '@/api/middlewares/protect';
import { JWTPayload } from '../auth/authSession.type';
import { BaseQuery, BaseServiceInput } from '@/types/Common';
import { getPermission } from '../auth/auth.utils';
@Controller('/assets')
export class AssetTrendingController {
  readonly service = Container.get(assetTrendingServiceToken);

  @Get('/trending', [
    protect({
      ignoreException: true,
    }),
  ])
  async getTrending(
    @Res() _res: Response,
    @Req() _req: Request,
    @Query() _query: BaseQuery,
    @Auth() _auth: JWTPayload,
  ) {
    const { filter, query } = buildQueryFilter(_query);
    const result = await this.service.trending({
      _filter: filter,
      _query: query,
      _permission: getPermission(_auth.roles),
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }
  @Get('/trending-soon', [
    protect({
      ignoreException: true,
    }),
  ])
  async getTrendingSoon(
    @Res() _res: Response,
    @Req() _req: Request,
    @Query() _query: BaseQuery,
    @Auth() _auth: JWTPayload,
  ) {
    const { filter, query } = buildQueryFilter(_query);
    const result = await this.service.trendingSoon({
      _filter: filter,
      _query: query,
      _permission: getPermission(_auth.roles),
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }

  // @Get('/search')
  // async search(@Res() _res: Response, @Req() _req: Request, @Query() _query: BaseQuery) {
  //   const { filter, query } = buildQueryFilter(_query);
  //   const result = await this.service.search({
  //     _filter: filter,
  //     _query: query,
  //   } as BaseServiceInput);
  //   _res.status(httpStatus.OK).json(result);
  // }

  // @Get('/:slug')
  // async getByNamePublic(
  //   @Res() _res: Response,
  //   @Req() _req: Request,
  //   @Query() _query: BaseQuery,
  //   @Params()
  //   _params: {
  //     slug: string;
  //   },
  // ) {
  //   const { filter } = buildQueryFilter(_query);

  //   const result = await this.service.getBySlug({
  //     _slug: _params.slug,
  //     _filter: filter,
  //   } as BaseServiceInput);
  //   _res.status(httpStatus.OK).json(result);
  // }
}
@Controller('/asset-trending')
export class AssetTrendingPrivateController {
  private service = Container.get(assetTrendingServiceToken);

  @Post('/', [])
  async create(
    @Res() _res: Response,
    @Auth() _auth: JWTPayload,
    @Req() _req: Request,
    @Body()
    _body: AssetTrending,
  ) {
    const result = await this.service.create({
      _content: _body,
      _subject: _auth.id,
    } as BaseServiceInput);
    _res.status(httpStatus.CREATED).json(result);
  }

  @Put('/:id', [])
  async update(
    @Res() _res: Response,
    @Auth() _auth: JWTPayload,
    @Req() _req: Request,
    @Params() _params: { id: string },
    @Body()
    body: AssetTrending,
  ) {
    const result = await this.service.update({
      _id: _params.id,
      _content: body,
      _subject: _auth.id,
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }

  @Delete('/:id', [])
  async delete(
    @Res() _res: Response,
    @Auth() _auth: JWTPayload,
    @Req() _req: Request,
    @Params() _params: { id: string },
    @Body()
    body: AssetTrending,
  ) {
    await this.service.delete({
      _id: _params.id,
      _content: body,
      _subject: _auth.id,
    } as BaseServiceInput);
    _res.status(httpStatus.NO_CONTENT).end();
  }

  // @Get('/:id', [])
  // async getByIdPrivate(
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
  //     _permission: 'private',
  //   } as BaseServiceInput);
  //   _res.status(httpStatus.OK).json(result);
  // }
}
