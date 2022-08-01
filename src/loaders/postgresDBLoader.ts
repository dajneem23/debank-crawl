import { Container } from 'typedi';

import { DILogger } from '@/loaders/loggerLoader';
import { AppDataSource } from '@/config/dbConfig';
const postgresDBLoader = async () => {
  const logger = Container.get(DILogger);

  AppDataSource.initialize().then(async () => {
    logger.success('Postgres reconnected');
  });
};

export default postgresDBLoader;
