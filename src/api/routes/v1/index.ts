import { Application, Router } from 'express';
import { attachControllers } from '@/utils/expressDecorators';
import env from '@/config/env';
import {
  UserController,
  EventController,
  AuthController,
  CategoryController,
  CompanyController,
  ProductController,
  PersonController,
  CoinController,
  NewsController,
  FundController,
} from '@/modules';

const route = Router();

export default (app: Application) => {
  app.use(`${env.API_PREFIX}/v1`, route);

  attachControllers(route, [
    UserController,
    EventController,
    AuthController,
    CategoryController,
    CompanyController,
    ProductController,
    PersonController,
    CoinController,
    NewsController,
    FundController,
  ]);
};
