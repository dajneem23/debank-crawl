/* eslint-disable @typescript-eslint/no-unused-vars */
import { Inject, Service } from 'typedi';
import { Controller, Res, Post, Body, Get, Query, Put, Params, Delete, Req, Auth } from '@/utils/expressDecorators';
import { Response } from 'express';
import { News, NewsService, NewsValidation } from '.';
import { buildQueryFilter } from '@/utils/common';
import httpStatus from 'http-status';
import { protect, protectPrivateAPI } from '@/api/middlewares/protect';
import { JWTPayload } from '../auth/authSession.type';
import { BaseQuery, BaseServiceInput } from '@/types/Common';
@Service()
@Controller('/news')
export class NewsController {
  @Inject()
  private service: NewsService;

  @Post('/', [NewsValidation.create, protectPrivateAPI()])
  async create(
    @Res() _res: Response,
    @Auth() _auth: JWTPayload,
    @Req() _req: Request,
    @Body()
    _body: News,
  ) {
    const result = await this.service.create({
      _content: _body,
      _subject: _auth.id,
    } as BaseServiceInput);
    _res.status(httpStatus.CREATED).json(result);
  }

  @Put('/:id', [NewsValidation.update, protectPrivateAPI()])
  async update(
    @Res() _res: Response,
    @Auth() _auth: JWTPayload,
    @Req() _req: Request,
    @Params() _params: { id: string },
    @Body()
    body: News,
  ) {
    const result = await this.service.update({
      _id: _params.id,
      _content: body,
      _subject: _auth.id,
    } as BaseServiceInput);
    _res.status(httpStatus.CREATED).json(result);
  }

  @Delete('/:id', [NewsValidation.delete, protectPrivateAPI()])
  async delete(
    @Res() _res: Response,
    @Auth() _auth: JWTPayload,
    @Req() _req: Request,
    @Params() _params: { id: string },
    @Body()
    body: News,
  ) {
    const result = await this.service.delete({
      _id: _params.id,
      _content: body,
      _subject: _auth.id,
    } as BaseServiceInput);
    _res.status(httpStatus.NO_CONTENT).end();
  }
  @Get('/', [NewsValidation.query])
  async get(@Res() _res: Response, @Req() _req: Request, @Query() _query: BaseQuery) {
    const { filter, query } = buildQueryFilter(_query);
    const result = await this.service.query({
      _filter: filter,
      _query: query,
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }
  @Get('/related', [NewsValidation.getRelated, protect()])
  async getRelated(@Res() _res: Response, @Req() _req: Request, @Query() _query: BaseQuery, @Auth() _auth: JWTPayload) {
    const { filter, query } = buildQueryFilter(_query);
    const result = await this.service.getRelated({
      _id: _auth.id,
      _filter: filter,
      _query: query,
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }

  @Get('/important', [NewsValidation.getImportant])
  async getImportant(@Res() _res: Response, @Req() _req: Request, @Query() _query: BaseQuery) {
    const { filter, query } = buildQueryFilter(_query);
    const result = await this.service.getImportant({
      _filter: filter,
      _query: query,
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }
  @Get('/:id', [NewsValidation.getById])
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
    _res.status(httpStatus.OK).json({
      id: '6308fff91cd276b4a1b6d760',
      slug: 'asd',
      categories: [{ id: '', name: 'abc' }],
      coin_tags: [
        { id: '6308fff91cd276b4a1b6d760', name: 'coin_tags1' },
        { id: '6308fff91cd276b4a1b6d760', name: 'coin_tags2' },
        { id: '6308fff91cd276b4a1b6d760', name: 'coin_tags3' },
      ],
      company_tags: [
        { id: '6308fff91cd276b4a1b6d760', name: 'Weiss Crypto Ratings1' },
        { id: '6308fff91cd276b4a1b6d760', name: 'Weiss Crypto Ratings12' },
        { id: '6308fff91cd276b4a1b6d760', name: 'Weiss Crypto Ratings13' },
      ],

      title: 'Mercury Wallet is pitching itself as Bitcoin’s answer to scalability, privacy',
      lang: 'vi',
      content: 'chao',
      headings: ['heading1', 'heading2'],
      summary: 'tom tat2',

      created_at: '2022-08-26T17:06:23.605Z',
      created_by: 'admin',
      deleted: false,
      keywords: ['trending'],
      number_relate_article: 6,
      photos: [
        'https://i1-vnexpress.vnecdn.net/2022/08/26/Bo-Cong-an-9374-1637833058-jpe-9051-3294-1661523682.jpg?w...',
      ],
      product_tags: [
        { id: '6308fff91cd276b4a1b6d760', name: 'product_tags' },
        { id: '6308fff91cd276b4a1b6d760', name: 'product_tags2' },
        { id: '6308fff91cd276b4a1b6d760', name: 'product_tags3' },
      ],
      source: 'https://cryptoslate.com/swift-considered-neutral-on-sanctions-debate-sparked-on-whether-ethereum-is-...',
      stars: 4,
      updated_at: '2022-08-26T17:06:23.605Z',
      views: 54,
      author: {
        full_name: 'admin',
        id: '63048b7e3021583b516c75f8',
      },
    });
  }
}
