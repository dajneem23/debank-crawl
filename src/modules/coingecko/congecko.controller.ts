/* eslint-disable @typescript-eslint/no-unused-vars */
import Container from 'typedi';
import { Controller, Res, Req, Get } from '@/utils/expressDecorators';
import { Response, Request } from 'express';
import httpStatus from 'http-status';
import { coinGeckoServiceToken } from './coingecko.service';

@Controller('/coingecko')
export class CoingeckoController {
  private service = Container.get(coinGeckoServiceToken);
  @Get('/global', [])
  async global(@Res() _res: Response, @Req() _req: Request) {
    const result = await this.service.global();
    _res.status(httpStatus.OK).json(result);
  }
}
