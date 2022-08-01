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
  APP_PORT: parseInt(getRuntimeEnv('APP_PORT'), 10),
  APP_HOST: getRuntimeEnv('APP_HOST'),
  API_PREFIX: getRuntimeEnv('API_PREFIX'),
  DB_HOST: getRuntimeEnv('DB_HOST'),
  DB_NAME: getRuntimeEnv('DB_NAME'),
  DB_PASS: getRuntimeEnv('DB_PASS'),
  DB_PORT: getRuntimeEnv('DB_PORT'),
  DB_USER: getRuntimeEnv('DB_USER'),
  REDIS_URI: getRuntimeEnv('REDIS_URI'),
  AWS_ACCESS_KEY_ID: getRuntimeEnv('AWS_ACCESS_KEY_ID'),
  AWS_SECRET_ACCESS_KEY: getRuntimeEnv('AWS_SECRET_ACCESS_KEY'),
  ACCESS_TOKEN_SECRET: getRuntimeEnv('ACCESS_TOKEN_SECRET'),
  ACCESS_TOKEN_LIFE: parseInt(getRuntimeEnv('ACCESS_TOKEN_LIFE')),
  AWS_REGION: getRuntimeEnv('AWS_REGION'),
  AWS_S3_BUCKET: getRuntimeEnv('AWS_S3_BUCKET'),
  FRONTEND_HOST: getRuntimeEnv('FRONTEND_HOST'),
  LOG_LEVEL: getRuntimeEnv('LOG_LEVEL') as LogLevel,
};

export default env;
