import { Application, Router } from 'express';
import { attachControllers } from '@/utils/expressDecorators';
import env from '@/config/env';
import {
  GlossaryController,
  CategoryController,
  CompanyController,
  ProductController,
  PersonController,
  EventController,
  UserController,
  AuthController,
  CoinController,
  NewsController,
  FundController,
  GlossaryPrivateController,
  CategoryPrivateController,
  CompanyPrivateController,
  ProductPrivateController,
  PersonPrivateController,
  EventPrivateController,
  CoinPrivateController,
  NewsPrivateController,
  FundPrivateController,
} from '@/modules';

const route = Router();

export default (app: Application) => {
  app.use(`${env.API_PREFIX}/v1`, route);
  /**
   * @description normal routes
   */
  attachControllers(route, [
    GlossaryController,
    CategoryController,
    CompanyController,
    ProductController,
    PersonController,
    EventController,
    UserController,
    AuthController,
    CoinController,
    NewsController,
    FundController,
  ]);
  /**
   * @description Private controllers
   */
  attachControllers(route, [
    GlossaryPrivateController,
    CategoryPrivateController,
    CompanyPrivateController,
    ProductPrivateController,
    PersonPrivateController,
    EventPrivateController,
    CoinPrivateController,
    NewsPrivateController,
    FundPrivateController,
  ]);
};
