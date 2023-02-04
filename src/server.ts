import { env } from 'process';
import 'reflect-metadata';
import Container from 'typedi';
import { DIDiscordClient, Discord } from './loaders/discord.loader';
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

    (await import('./loaders/logger.loader')).default();
    // Database (mongodb)
    await (await import('./loaders/mongoDB.loader')).default();
    await (await import('./loaders/pg.loader')).default();

    if (env.MODE == 'production') {
      await (await import('./loaders/telegram.loader')).default();
    }

    // Caching (Redis)
    await (await import('./loaders/redis.loader')).default();

    (await import('./loaders/worker.loader')).default();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
