import env from './src/config/env';

const config = {
  name: env.DB_NAME || 'default',
  type: 'postgres',
  host: env.DB_HOST,
  port: +env.DB_PORT,
  database: env.DB_NAME,
  username: env.DB_USER,
  password: env.DB_PASS,
  synchronize: false,
  seeds: ['src/seeds/**/*{.ts,.js}'],
  factories: ['src/factories/**/*{.ts,.js}'],
  entities: ['src/models/*.model.ts'],
  migrations: ['src/migrations/*'],
};

export default config;
