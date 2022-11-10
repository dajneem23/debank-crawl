import { Client, Pool } from 'pg';
import { env } from 'process';
import Container, { Token } from 'typedi';
import { DILogger } from './loggerLoader';

export const pgClientToken = new Token<Client>('_pgClient');
export const pgPoolToken = new Token<Pool>('_pgPool');

const pgClient = new Client({
  host: env.MB_DB_HOST,
  user: env.MB_DB_USER,
  password: env.MB_DB_PASS,
  database: env.MB_DB_DBNAME,
  port: +env.MB_DB_PORT,
  ssl: {
    rejectUnauthorized: false,
  },
});

const pgPool = new Pool({
  host: env.MB_DB_HOST,
  user: env.MB_DB_USER,
  password: env.MB_DB_PASS,
  database: env.MB_DB_DBNAME,
  port: +env.MB_DB_PORT,
  ssl: {
    rejectUnauthorized: false,
  },
});

const logger = Container.get(DILogger);

const pgLoader = async () => {
  // pgClient.connect((err) => {
  //   if (err) {
  //     logger.error('db_error', err);
  //     return;
  //   }
  //   logger.success('connected', 'Client Postgres');
  // });
  pgPool.connect((err) => {
    if (err) {
      logger.error('db_error', err);
      return;
    }
    logger.success('connected', 'Pool Postgres');
  });
  // Container.set(pgClientToken, pgClient);
  Container.set(pgPoolToken, pgPool);

  return pgPool;
};
export default pgLoader;
