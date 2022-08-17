import { Inject, Service } from 'typedi';
import { Controller, Res, Post, Body, Get, Query, Put, Params, Delete, Req, Auth } from '@/utils/expressDecorators';
import { Response } from 'express';
import { Company, CompanyService, CompanyValidation } from '.';
import { buildQueryFilter } from '@/utils/common';
import httpStatus from 'http-status';
import { protectPrivateAPI } from '@/api/middlewares/protect';
import { JWTPayload } from '../auth/authSession.type';
import { BaseQuery, BaseServiceInput } from '@/types/Common';
@Service()
@Controller('/companies')
export class CompanyController {
  @Inject()
  private service: CompanyService;

  @Post('/', [CompanyValidation.create, protectPrivateAPI()])
  async create(
    @Res() _res: Response,
    @Auth() _auth: JWTPayload,
    @Req() _req: Request,
    @Body()
    _body: Company,
  ) {
    const result = await this.service.create({
      _content: _body,
      _subject: _auth.id,
    } as BaseServiceInput);
    _res.status(httpStatus.CREATED).json(result);
  }

  @Put('/:id', [CompanyValidation.update, protectPrivateAPI()])
  async update(
    @Res() _res: Response,
    @Auth() _auth: JWTPayload,
    @Req() _req: Request,
    @Params() _params: { id: string },
    @Body()
    _body: Company,
  ) {
    const result = await this.service.update({
      _id: _params.id,
      _content: _body,
      _subject: _auth.id,
    } as BaseServiceInput);
    _res.status(httpStatus.CREATED).json(result);
  }

  @Delete('/:id', [CompanyValidation.delete, protectPrivateAPI()])
  async delete(
    @Res() _res: Response,
    @Auth() _auth: JWTPayload,
    @Req() _req: Request,
    @Params() _params: { id: string },
    @Body()
    _body: Company,
  ) {
    const result = await this.service.delete({
      _id: _params.id,
      _content: _body,
      _subject: _auth.id,
    } as BaseServiceInput);
    _res.status(httpStatus.NO_CONTENT).end();
  }
  @Get('/', [CompanyValidation.query])
  async get(@Res() _res: Response, @Req() _req: Request, @Query() _query: BaseQuery) {
    const { filter, query } = buildQueryFilter(_query);
    const result = await this.service.query({
      _filter: filter,
      _query: query,
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }
  @Get('/:id', [CompanyValidation.getById])
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
}
