import { Application, Router } from 'express';
import { attachControllers } from '@/utils/expressDecorators';
import env from '@/config/env';
import {
  BlockchainController,
  GlossaryController,
  ExchangeController,
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
  ExchangePrivateController,
  GlossaryPrivateController,
  CategoryPrivateController,
  SettingPrivateController,
  ProductPrivateController,
  CompanyPrivateController,
  PersonPrivateController,
  EventPrivateController,
  CoinPrivateController,
  NewsPrivateController,
  FundPrivateController,
} from '@/modules';
import StorageController from '@/modules/storage/storage.controller';

const publicRoute = Router();
const privateRoute = Router();

export default (app: Application) => {
  app.use(`${env.API_PREFIX}/v1`, publicRoute);
  app.use(`${env.API_PREFIX}/v1/private`, privateRoute);
  /**
   * @description normal routes
   * @route /v1/public
   */
  attachControllers(publicRoute, [
    BlockchainController,
    GlossaryController,
    CategoryController,
    ExchangeController,
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
   * @route /v1/private
   */
  attachControllers(privateRoute, [
    BlockchainPrivateController,
    ExchangePrivateController,
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
