import { Application, Router } from 'express';
import { attachControllers } from '@/utils/expressDecorators';
import env from '@/config/env';
import {} from '@/modules';

const publicRoute = Router();
const privateRoute = Router();

export default (app: Application) => {
  // ? Public routes for all users
  app.use(`${env.API_PREFIX}/v1/public`, publicRoute);
  // ? private route for admin
  // ! require token
  app.use(`${env.API_PREFIX}/v1/private`, privateRoute);
  /**
   * @description normal routes
   * * /v1/public
   */
  attachControllers(publicRoute, []);
  /**
   * @description Private controllers
   * * /v1/private
   */
  attachControllers(privateRoute, []);
};
