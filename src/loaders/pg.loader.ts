import { Client, Pool } from 'pg';
import { env } from 'process';
import Container, { Token } from 'typedi';
import { DILogger } from './logger.loader';
import pgPromise from 'pg-promise';
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
const pgPromiseDb = pgPromise()({
  host: env.MB_DB_HOST,
  user: env.MB_DB_USER,
  password: env.MB_DB_PASS,
  database: env.MB_DB_DBNAME,
  port: +env.MB_DB_PORT,
  ssl: {
    rejectUnauthorized: false,
  },
});

export const pgPromiseDBToken = new Token<typeof pgPromiseDb>('_pgPromiseDb');

const pgLoader = async () => {
  const logger = Container.get(DILogger);
  try {
    await pgPool.connect();
    await pgClient.connect();
    await pgPromiseDb.connect();
    Container.set(pgPoolToken, pgPool);
    Container.set(pgClientToken, pgClient);
    Container.set(pgPromiseDBToken, pgPromiseDb);
    logger.success('connected', 'Pool Postgres');
  } catch (err) {
    logger.error('error', 'pool:connect:pg', err);
  }
};
export default pgLoader;
