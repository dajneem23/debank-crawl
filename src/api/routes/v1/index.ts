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
  AssetTrendingController,
  PersonController,
  EventController,
  UserController,
  AuthController,
  AssetController,
  NewsController,
  FundController,
  CoingeckoController,
  BlockchainPrivateController,
  ExchangePrivateController,
  GlossaryPrivateController,
  CategoryPrivateController,
  SettingPrivateController,
  ProductPrivateController,
  CompanyPrivateController,
  PersonPrivateController,
  EventPrivateController,
  AssetPrivateController,
  NewsPrivateController,
  FundPrivateController,
} from '@/modules';
import StorageController from '@/modules/storage/storage.controller';

const publicRoute = Router();
const privateRoute = Router();

export default (app: Application) => {
  app.use(`${env.API_PREFIX}/v1/public`, publicRoute);
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
    // ! asset-trending before asset
    AssetTrendingController,
    AssetController,
    NewsController,
    FundController,
    CoingeckoController,
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
    AssetPrivateController,
    NewsPrivateController,
    FundPrivateController,
  ]);
};
