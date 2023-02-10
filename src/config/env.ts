import { getRuntimeEnv, parseJSONFromFile } from '../utils/common';
import { LogLevel } from '@/core/logger';

type AppEnv = 'local' | 'development' | 'production';

// Local env file path
const LOCAL_ENV_FILEPATH = './env.local.json';

/**
 * Loads ENV config
 */
(() => {
  let envConfig: { [key: string]: string };
  if (process.env.ENV_VARS) {
    // Load config variables from CI/CD server
    envConfig = JSON.parse(process.env.ENV_VARS);
  } else {
    // Load config variables from local file
    envConfig = parseJSONFromFile(LOCAL_ENV_FILEPATH);
  }
  if (typeof envConfig === 'object') {
    Object.keys(envConfig).forEach((key) => (process.env[key] = envConfig[key]));
  }
})();

/**
 * ENV config
 */
const env = {
  APP_ENV: getRuntimeEnv('APP_ENV') as AppEnv,
  APP_NAME: getRuntimeEnv('APP_NAME'),
  APP_VERSION: getRuntimeEnv('APP_VERSION'),
  MODE: getRuntimeEnv('MODE'),
  MONGO_URI: getRuntimeEnv('MONGO_URI'),
  MONGO_URI_BINANCE: getRuntimeEnv('MONGO_URI_BINANCE'),

  REDIS_URI: getRuntimeEnv('REDIS_URI'),
  AWS_ACCESS_KEY_ID: getRuntimeEnv('AWS_ACCESS_KEY_ID'),
  AWS_SECRET_ACCESS_KEY: getRuntimeEnv('AWS_SECRET_ACCESS_KEY'),
  AWS_REGION: getRuntimeEnv('AWS_REGION'),
  AWS_S3_BUCKET: getRuntimeEnv('AWS_S3_BUCKET'),
  LOG_LEVEL: getRuntimeEnv('LOG_LEVEL') as LogLevel,

  COINMARKETCAP_API_KEY: getRuntimeEnv('COINMARKETCAP_API_KEY'),

  DISCORD_BOT_TOKEN: getRuntimeEnv('DISCORD_BOT_TOKEN'),
  DISCORD_BOT_CLIENT_ID: getRuntimeEnv('DISCORD_BOT_CLIENT_ID'),
  DISCORD_NOTIFICATION_CHANNEL_ID: getRuntimeEnv('DISCORD_NOTIFICATION_CHANNEL_ID'),
  TELEGRAM_BOT_TOKEN: getRuntimeEnv('TELEGRAM_BOT_TOKEN'),
  DATAFI_API_URL: getRuntimeEnv('DATAFI_API_URL'),
  MB_DB_DBNAME: getRuntimeEnv('MB_DB_DBNAME'),
  MB_DB_PORT: getRuntimeEnv('MB_DB_PORT'),
  MB_DB_USER: getRuntimeEnv('MB_DB_USER'),
  MB_DB_PASS: getRuntimeEnv('MB_DB_PASS'),
  MB_DB_HOST: getRuntimeEnv('MB_DB_HOST'),
  BINANCE_API_KEY: getRuntimeEnv('BINANCE_API_KEY'),
  BINANCE_API_SECRET: getRuntimeEnv('BINANCE_API_SECRET'),
};

export default env;
