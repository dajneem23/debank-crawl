import { Inject, Service } from 'typedi';
import { Controller, Res, Post, Body } from '@/utils/expressDecorators';
import UserService from '@/modules/user/user.service';
import { Response } from 'express';
import * as userValidation from './user.validation';
import { AuthRequest } from './user.type';

@Service()
@Controller('/users')
export default class UserController {
  @Inject()
  private userService: UserService;

  @Post('/login', [userValidation.login])
  async postLogin(@Res() res: Response, @Body() body: AuthRequest) {
    await this.userService.login(body);
  }
}
