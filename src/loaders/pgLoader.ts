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

const pgLoader = async () => {
  const logger = Container.get(DILogger);
  try {
    await pgPool.connect();
    Container.set(pgPoolToken, pgPool);
    logger.success('connected', 'Pool Postgres');
  } catch (err) {
    logger.error('error', 'pool:connect:pg', err);
  }
};
export default pgLoader;
