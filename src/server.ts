import { env } from 'process';
import 'reflect-metadata';
import Container from 'typedi';
import { DIDiscordClient, Discord } from './loaders/discordLoader';
/**
 *  @description this import is required to initialize service class
 */

(async () => {
  try {
    // ----------------------------------------------------------------
    // Load modules
    // ----------------------------------------------------------------
    // Logger
    if (env.MODE == 'production') {
      new Discord();
    }

    (await import('./loaders/loggerLoader')).default();
    // Database (mongodb)
    await (await import('./loaders/mongoDBLoader')).default();
    await (await import('./loaders/pgLoader')).default();

    if (env.MODE == 'production') {
      await (await import('./loaders/telegramLoader')).default();
    }

    // Caching (Redis)
    await (await import('./loaders/redisClientLoader')).default();

    // (await import('./loaders/workerLoader')).default();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
