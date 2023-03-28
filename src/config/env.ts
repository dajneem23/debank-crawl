import { getRuntimeEnv, parseJSONFromFile } from '../utils/common';
import { LogLevel } from '../core/logger';

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
export const env = {
  MONGO_URI: getRuntimeEnv('MONGO_URI'),
  MONGO_URI_BINANCE: getRuntimeEnv('MONGO_URI_BINANCE'),

  REDIS_URI: getRuntimeEnv('REDIS_URI'),

  COINMARKETCAP_API_KEY: getRuntimeEnv('COINMARKETCAP_API_KEY'),

  DISCORD_BOT_TOKEN: getRuntimeEnv('DISCORD_BOT_TOKEN'),
  DISCORD_BOT_CLIENT_ID: getRuntimeEnv('DISCORD_BOT_CLIENT_ID'),

  TELEGRAM_BOT_TOKEN: getRuntimeEnv('TELEGRAM_BOT_TOKEN'),

  MB_DB_DBNAME: getRuntimeEnv('MB_DB_DBNAME'),
  MB_DB_PORT: getRuntimeEnv('MB_DB_PORT'),
  MB_DB_USER: getRuntimeEnv('MB_DB_USER'),
  MB_DB_PASS: getRuntimeEnv('MB_DB_PASS'),
  MB_DB_HOST: getRuntimeEnv('MB_DB_HOST'),

  BINANCE_API_KEY: getRuntimeEnv('BINANCE_API_KEY'),
  BINANCE_API_SECRET: getRuntimeEnv('BINANCE_API_SECRET'),

  NANSEN_USERNAME: getRuntimeEnv('NANSEN_USERNAME'),
  NANSEN_PASSWORD: getRuntimeEnv('NANSEN_PASSWORD'),
};

export default env;
