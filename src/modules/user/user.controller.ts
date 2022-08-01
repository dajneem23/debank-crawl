import { Inject, Service } from 'typedi';
import httpStatusCode from 'http-status';
import { Controller, Get, Query, Res, Post, Body, Params, Put, Patch } from '@/utils/expressDecorators';
import UserService from '@/modules/user/user.service';
import { Response } from 'express';
import * as userValidation from './user.validation';
import { buildQueryFilter } from '@/utils/common';
import { AuthRequest, SubscribeRequest, UserParams, UserQuery, UserRequest } from './user.type';
import * as bcrypt from 'bcryptjs';
import { generateToken } from '@/modules/user/user.util';
import { authenticate } from '@/modules/auth/auth.validation';
import { pick } from 'lodash';

@Service()
@Controller('/users')
export default class UserController {
  @Inject()
  private userService: UserService;

  @Post('/login', [userValidation.login])
  async postLogin(@Res() res: Response, @Body() body: AuthRequest) {
    const user = await this.userService.login(body);
    await bcrypt.compare(body.password, user.password, async function (err, response) {
      if (err) {
        res.status(httpStatusCode.UNAUTHORIZED).json({});
      }
      if (response) {
        const accessToken = await generateToken(user);
        if (!accessToken) {
          res.status(httpStatusCode.UNAUTHORIZED).json({});
        }
        res
          .status(httpStatusCode.OK)
          .json({ data: { accessToken, user: pick(user, ['id', 'email', 'avatar', 'username']) } });
      } else {
        res.status(httpStatusCode.UNAUTHORIZED).json({});
      }
    });
  }

  // Get List
  @Get('/', [authenticate, userValidation.privateQuery])
  async getUserList(@Res() res: Response, @Query() query: UserQuery) {
    const opts = buildQueryFilter(query);
    const result = await this.userService.findAllUser({ ...opts.filter }, opts.query);
    res.status(httpStatusCode.OK).json({ data: result });
  }

  @Patch('/subscribe', [authenticate, userValidation.subscribe])
  async following(@Res() res: Response, @Body() body: SubscribeRequest) {
    const { user } = res.locals;
    const result = await this.userService.following(user.id, body);
    res.status(httpStatusCode.OK).json({ data: result });
  }

  // Get profile
  @Get('/me', [authenticate])
  async getUserProfile(@Res() res: Response) {
    const { user } = res.locals;
    const data = await this.userService.findUserById(user.id);
    res.status(httpStatusCode.OK).json({ data });
  }
  // Get By ID
  @Get('/:id', [authenticate, userValidation.privateQuery])
  async getUserById(@Res() res: Response, @Params() params: UserParams) {
    const { id } = params;
    const result = await this.userService.findUserById(id);
    res.status(httpStatusCode.OK).json({ data: result });
  }

  // Create User
  @Post('/', [authenticate, userValidation.createUser])
  async createUser(@Res() res: Response, @Body() body: UserRequest) {
    const result = await this.userService.create(body);
    res.status(httpStatusCode.CREATED).json({ data: result });
  }

  // Update User
  @Put('/:id', [authenticate, userValidation.updateUser])
  async updateUser(@Res() res: Response, @Params() params: UserParams, @Body() body: UserRequest) {
    const { id } = params;
    const result = await this.userService.updateUser(id, body);
    res.status(httpStatusCode.OK).json({ data: result });
  }
}
