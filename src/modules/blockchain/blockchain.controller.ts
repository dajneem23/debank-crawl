import Container from 'typedi';
import { Controller, Res, Post, Body, Get, Query, Put, Params, Delete, Req, Auth } from '@/utils/expressDecorators';
import { Request, Response } from 'express';
import { Blockchain, BlockchainServiceToken, BlockchainValidation } from '.';
import { buildQueryFilter } from '@/utils/common';
import httpStatus from 'http-status';
import { protectPrivateAPI } from '@/api/middlewares/protect';
import { JWTPayload } from '../auth/authSession.type';
import { BaseQuery, BaseServiceInput } from '@/types/Common';
@Controller('/blockchains')
export class BlockchainController {
  private service = Container.get(BlockchainServiceToken);

  @Post('/', [protectPrivateAPI(), BlockchainValidation.create])
  async create(
    @Res() _res: Response,
    @Auth() _auth: JWTPayload,
    @Req() _req: Request,
    @Body()
    _body: Blockchain,
  ) {
    const result = await this.service.create({
      _content: _body,
      _subject: _auth.id,
    } as BaseServiceInput);
    _res.status(httpStatus.CREATED).json(result);
  }

  @Put('/:id', [protectPrivateAPI(), BlockchainValidation.update])
  async update(
    @Res() _res: Response,
    @Auth() _auth: JWTPayload,
    @Req() _req: Request,
    @Params() _params: { id: string },
    @Body()
    _body: Blockchain,
  ) {
    const result = await this.service.update({
      _id: _params.id,
      _content: _body,
      _subject: _auth.id,
    } as BaseServiceInput);
    _res.status(httpStatus.CREATED).json(result);
  }

  @Delete('/:id', [protectPrivateAPI(), BlockchainValidation.delete])
  async delete(
    @Res() _res: Response,
    @Auth() _auth: JWTPayload,
    @Req() _req: Request,
    @Params() _params: { id: string },
    @Body()
    _body: Blockchain,
  ) {
    await this.service.delete({
      _id: _params.id,
      _content: _body,
      _subject: _auth.id,
    } as BaseServiceInput);
    _res.status(httpStatus.NO_CONTENT).end();
  }
  @Get('/', [BlockchainValidation.query])
  async getByUser(@Res() _res: Response, @Req() _req: Request, @Query() _query: BaseQuery) {
    const { filter, query } = buildQueryFilter(_query);
    const result = await this.service.query({
      _filter: filter,
      _query: query,
      _permission: 'public',
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }
  @Get('/search', [BlockchainValidation.search])
  async search(@Res() _res: Response, @Req() _req: Request, @Query() _query: BaseQuery) {
    const { filter, query } = buildQueryFilter(_query);
    const result = await this.service.search({
      _filter: filter,
      _query: query,
      _permission: 'public',
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }
  // @Get('/:id', [BlockchainValidation.getById])
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
  @Get('/:slug', [BlockchainValidation.getBySlug])
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
@Controller('/private/blockchains')
export class BlockchainPrivateController {
  private service = Container.get(BlockchainServiceToken);

  @Get('/', [protectPrivateAPI(), BlockchainValidation.query])
  async getByAdmin(@Res() _res: Response, @Req() _req: Request, @Query() _query: BaseQuery) {
    const { filter, query } = buildQueryFilter(_query);
    const result = await this.service.query({
      _filter: filter,
      _query: query,
      _permission: 'private',
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }

  @Get('/:id', [protectPrivateAPI(), BlockchainValidation.getById])
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