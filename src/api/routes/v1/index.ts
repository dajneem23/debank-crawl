import { Application, Router } from 'express';
import { attachControllers } from '@/utils/expressDecorators';
import env from '@/config/env';
import UserController from '@/modules/user/user.controller';
import EventController from '@/modules/event/event.controller';
import CategoryController from '@/modules/category/category.controller';
const route = Router();

export default (app: Application) => {
  app.use(`${env.API_PREFIX}/v1`, route);

  attachControllers(route, [UserController, EventController, CategoryController]);
};
