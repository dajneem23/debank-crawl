import { Container, Token } from 'typedi';

import { Logger } from '@/core/logger';
export const DILogger = new Token<Logger>('LOGGER');

const loggerLoader = (): Logger => {
  const logger = new Logger('App', process.env.MODE == 'production' ? 'info' : 'debug');
  Container.set(DILogger, logger);
  logger.success('success', 'Logger');

  return logger;
};

export default loggerLoader;
