import { Application, Router } from 'express';
import { attachControllers } from '@/utils/expressDecorators';
import env from '@/config/env';
import {
  BlockchainController,
  GlossaryController,
  CategoryController,
  CompanyController,
  SettingController,
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
  SettingPrivateController,
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
    StorageController,
    SettingController,
    ProductController,
    CompanyController,
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
    BlockchainPrivateController,
    GlossaryPrivateController,
    CategoryPrivateController,
    CompanyPrivateController,
    SettingPrivateController,
    ProductPrivateController,
    PersonPrivateController,
    EventPrivateController,
    CoinPrivateController,
    NewsPrivateController,
    FundPrivateController,
  ]);
};
