import { env } from 'process';
import 'reflect-metadata';
import Container from 'typedi';
import { DIDiscordClient, Discord } from './loaders/discord.loader';
import { exitHandler } from './core/handler';
import { dockerContainerStats, systemInfo } from './utils/system';
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

    //do something when app is closing
    if (env.MODE == 'production') {
      process.on('exit', exitHandler.bind(null, { cleanup: true }));
      //catches ctrl+c event
      process.on('SIGINT', exitHandler.bind(null, { exit: true }));
      // catches "kill pid" (for example: nodemon restart)
      process.on('SIGUSR1', exitHandler.bind(null, { exit: true }));
      process.on('SIGUSR2', exitHandler.bind(null, { exit: true }));
      //catches uncaught exceptions
      process.on('uncaughtException', exitHandler.bind(null, { exit: true }));
      process.on('unhandledRejection', exitHandler.bind(null, { exit: true }));
    }
  } catch (err) {
    console.error(err);
    if (env.MODE == 'production') {
      exitHandler.call(null, { exit: true });
    } else {
      process.exit(1);
    }
  }
})();
