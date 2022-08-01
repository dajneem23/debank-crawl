import env from './env';
import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import path from 'path';

const config = {
  name: env.DB_NAME || 'default',
  type: 'postgres',
  host: env.DB_HOST,
  port: +env.DB_PORT,
  database: env.DB_NAME,
  username: env.DB_USER,
  password: env.DB_PASS,
  synchronize: false,
  logging: true,
  entities: [path.join(__dirname, '../models/*.model.ts')],
  migrations: [path.join(__dirname, '../migrations/*')],
  migrationsTableName: 'content_service_migration',
  // subscribers: [],
};

export const AppDataSource = new DataSource(config as DataSourceOptions);
export default config;
