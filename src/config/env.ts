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
  APP_PORT: parseInt(getRuntimeEnv('APP_PORT'), 10),
  APP_HOST: getRuntimeEnv('APP_HOST'),
  API_PREFIX: getRuntimeEnv('API_PREFIX'),
  MONGO_URI: getRuntimeEnv('MONGO_URI'),

  REDIS_URI: getRuntimeEnv('REDIS_URI'),
  AWS_ACCESS_KEY_ID: getRuntimeEnv('AWS_ACCESS_KEY_ID'),
  AWS_SECRET_ACCESS_KEY: getRuntimeEnv('AWS_SECRET_ACCESS_KEY'),
  AWS_REGION: getRuntimeEnv('AWS_REGION'),
  AWS_S3_BUCKET: getRuntimeEnv('AWS_S3_BUCKET'),
  FRONTEND_HOST: getRuntimeEnv('FRONTEND_HOST'),
  LOG_LEVEL: getRuntimeEnv('LOG_LEVEL') as LogLevel,
  JWT_SECRET: getRuntimeEnv('JWT_SECRET'),
  JWT_ACCESS_TOKEN_EXP: getRuntimeEnv('JWT_ACCESS_TOKEN_EXP'),
  JWT_REFRESH_TOKEN_EXP: getRuntimeEnv('JWT_REFRESH_TOKEN_EXP'),
  RESET_PASSWORD_TOKEN_EXP: getRuntimeEnv('RESET_PASSWORD_TOKEN_EXP'),
  VERIFY_EMAIL_TOKEN_EXP: getRuntimeEnv('VERIFY_EMAIL_TOKEN_EXP'),
  CONFIRM_REQUEST_TOKEN_EXP: getRuntimeEnv('CONFIRM_REQUEST_TOKEN_EXP'),

  MAILGUN_API_KEY: getRuntimeEnv('MAILGUN_API_KEY'),
  MAILGUN_PUBLIC_KEY: getRuntimeEnv('MAILGUN_PUBLIC_KEY'),
  MAILGUN_DOMAIN: getRuntimeEnv('MAILGUN_DOMAIN'),
  COINMARKETCAP_API_KEY: getRuntimeEnv('COINMARKETCAP_API_KEY'),
  MARKETCAP_FETCH_INTERVAL: getRuntimeEnv('MARKETCAP_FETCH_INTERVAL'),
  CRYPTO_LISTENING_KEY: getRuntimeEnv('CRYPTO_LISTENING_KEY'),
  CRYPTO_LISTENING_BASE_URL: getRuntimeEnv('CRYPTO_LISTENING_BASE_URL'),

  DISCORD_BOT_TOKEN: getRuntimeEnv('DISCORD_BOT_TOKEN'),
  DISCORD_BOT_CLIENT_ID: getRuntimeEnv('DISCORD_BOT_CLIENT_ID'),
  DISCORD_NOTIFICATION_CHANNEL_ID: getRuntimeEnv('DISCORD_NOTIFICATION_CHANNEL_ID'),
  TELEGRAM_BOT_TOKEN: getRuntimeEnv('TELEGRAM_BOT_TOKEN'),
  NANSEN_ALERT_GROUP_ID: getRuntimeEnv('NANSEN_ALERT_GROUP_ID'),
  DATAFI_API_URL: getRuntimeEnv('DATAFI_API_URL'),
  DATAFI_USERNAME: getRuntimeEnv('DATAFI_USERNAME'),
  DATAFI_PASSWORD: getRuntimeEnv('DATAFI_PASSWORD'),
  MB_DB_DBNAME: getRuntimeEnv('MB_DB_DBNAME'),
  MB_DB_PORT: getRuntimeEnv('MB_DB_PORT'),
  MB_DB_USER: getRuntimeEnv('MB_DB_USER'),
  MB_DB_PASS: getRuntimeEnv('MB_DB_PASS'),
  MB_DB_HOST: getRuntimeEnv('MB_DB_HOST'),
};

export default env;
