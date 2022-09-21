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
  EventPrivateController,
  CategoryPrivateController,
  CompanyPrivateController,
  ProductPrivateController,
  PersonPrivateController,
  CoinPrivateController,
  NewsPrivateController,
  FundPrivateController,
} from '@/modules';

const route = Router();

export default (app: Application) => {
  app.use(`${env.API_PREFIX}/v1`, route);
  /**
   * @description Attach controllers to the route
   */
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
  /**
   * @description Private controllers
   */
  attachControllers(route, [
    EventPrivateController,
    CategoryPrivateController,
    CompanyPrivateController,
    ProductPrivateController,
    PersonPrivateController,
    CoinPrivateController,
    NewsPrivateController,
    FundPrivateController,
  ]);
};
