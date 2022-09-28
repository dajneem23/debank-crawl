import { Application, Router } from 'express';
import { attachControllers } from '@/utils/expressDecorators';
import env from '@/config/env';
import {
  BlockchainController,
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
  BlockchainPrivateController,
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
import StorageController from '@/modules/storage/storage.controller';

const route = Router();

export default (app: Application) => {
  app.use(`${env.API_PREFIX}/v1`, route);
  /**
   * @description normal routes
   */
  attachControllers(route, [
    BlockchainController,
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
    StorageController,
  ]);
  /**
   * @description Private controllers
   */
  attachControllers(route, [
    BlockchainPrivateController,
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
