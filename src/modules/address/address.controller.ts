import { Inject, Service } from 'typedi';
import httpStatusCode from 'http-status';
import { Body, Controller, Get, Post, Put, Delete, Auth, Res, Query, Patch, Params } from '@/utils/expressDecorators';
import { Response } from 'express';
import { protect, protectPrivateAPI } from '@/api/middlewares/protect';
import * as addressValidation from './address.validation';
import AddressService from '@/modules/address/address.service';
import { JWTPayload } from '@/modules/auth/authSession.type';
import { BaseQuery } from '@/types/Common';
import { getVNProvince, getVNDistrict, getVNWard } from './VN';
import { buildQueryFilter } from '@/utils/common';
import { UserService } from '@/modules/user/user.service';

@Service()
@Controller('/')
export default class AddressController {
  @Inject()
  private addressService: AddressService;

  @Inject()
  private userService: UserService;

  // ----------------------------------------------------------------
  // PUBLIC ROUTES
  // ----------------------------------------------------------------

  @Get('/addresses', [addressValidation.query, protect()])
  async query(@Res() res: Response, @Auth() auth: JWTPayload, @Query() query: BaseQuery) {
    const opts = buildQueryFilter(query);
    const result = await this.addressService.query({ ...opts.filter, user_id: auth.id }, opts.query);
    res.status(httpStatusCode.OK).json(result);
  }

  @Get('/addresses/VN/province', [])
  async getVNProvince(@Res() res: Response) {
    const result = getVNProvince();
    res.status(httpStatusCode.OK).json(result);
  }

  @Get('/addresses/VN/district', [addressValidation.queryDistrictWard])
  async getVNDistrict(@Res() res: Response, @Query() query: { code: string }) {
    const result = getVNDistrict(query.code);
    res.status(httpStatusCode.OK).json(result);
  }

  @Get('/addresses/VN/ward', [addressValidation.queryDistrictWard])
  async getVNWard(@Res() res: Response, @Query() query: any) {
    const result = getVNWard(query.code);
    res.status(httpStatusCode.OK).json(result);
  }

  @Post('/addresses', [addressValidation.createUpdate, protect()])
  async create(@Res() res: Response, @Auth() auth: JWTPayload, @Body() body: any) {
    const address = await this.addressService.create({ ...body, user_id: auth.id });
    res.status(httpStatusCode.CREATED).json(address);
  }

  @Put('/addresses/:id', [addressValidation.createUpdate, protect()])
  async update(@Res() res: Response, @Auth() auth: JWTPayload, @Body() body: any, @Params() params: { id: string }) {
    const address = await this.addressService.update({ id: params.id, user_id: auth.id }, body);
    res.status(httpStatusCode.OK).json(address);
  }

  @Delete('/addresses/:id', [protect()])
  async delete(@Res() res: Response, @Auth() auth: JWTPayload, @Params() params: { id: string }) {
    await this.addressService.delete({ id: params.id, user_id: auth.id });
    res.status(httpStatusCode.NO_CONTENT).end();
  }

  @Patch('/addresses/:id/set-default', [protect()])
  async setAsDefault(@Res() res: Response, @Auth() auth: JWTPayload, @Params() params: { id: string }) {
    await this.addressService.setAsDefault({ id: params.id, user_id: auth.id });
    res.status(httpStatusCode.NO_CONTENT).end();
  }

  // ----------------------------------------------------------------
  // PRIVATE ROUTES
  // ----------------------------------------------------------------

  @Get('/private/users/:id/addresses', [addressValidation.query, protectPrivateAPI()])
  async privateQueryUserAddresses(@Res() res: Response, @Params() params: { id: string }, @Query() query: BaseQuery) {
    const opts = buildQueryFilter(query);
    const result = await this.addressService.query({ user_id: params.id }, opts.query);
    res.status(httpStatusCode.OK).json(result);
  }

  @Post('/private/users/:id/addresses', [addressValidation.createUpdate, protectPrivateAPI()])
  async privateCreateUserAddress(@Res() res: Response, @Params() params: { id: string }, @Body() body: any) {
    // Get user
    const user = await this.userService.getById(params.id);
    // Create address
    const address = await this.addressService.create({ ...body, user_id: user.id });
    res.status(httpStatusCode.CREATED).json(address);
  }

  @Put('/private/addresses/:id', [addressValidation.createUpdate, protectPrivateAPI()])
  async privateUpdate(@Res() res: Response, @Body() body: any, @Params() params: { id: string }) {
    const address = await this.addressService.update({ id: params.id }, body);
    res.status(httpStatusCode.OK).json(address);
  }

  @Delete('/private/addresses/:id', [protectPrivateAPI()])
  async privateDelete(@Res() res: Response, @Params() params: { id: string }) {
    await this.addressService.delete({ id: params.id });
    res.status(httpStatusCode.NO_CONTENT).end();
  }

  @Patch('/private/addresses/:id/set-default', [protectPrivateAPI()])
  async privateSetAsDefault(@Res() res: Response, @Params() params: { id: string }) {
    // Get address detail
    const address = await this.addressService.getOne({ id: params.id });
    // Set as default
    await this.addressService.setAsDefault({ id: address.id, user_id: address.user_id });
    res.status(httpStatusCode.NO_CONTENT).end();
  }
}
