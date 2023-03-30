import 'reflect-metadata';
import { exitHandler } from './core/handler';
/**
 *  @description this import is required to initialize service class
 */
(async () => {
  try {
    await import('./config/env');
    if (process.env.MODE == 'production') {
      process.setMaxListeners(0);
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('events').EventEmitter.prototype._maxListeners = 100;
      //do something when app is closing
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

    // process.env.MODE = 'production';
    // ----------------------------------------------------------------
    // Load modules
    // ----------------------------------------------------------------
    // Logger()
    (await import('./loaders/logger.loader')).default();
    // Database (mongodb)
    await (await import('./loaders/mongoDB.loader')).default();
    // Database (postgres)
    await (await import('./loaders/pg.loader')).default();
    // Caching (Redis)
    await (await import('./loaders/redis.loader')).default();
    // Discord
    if (process.env.MODE == 'production') {
      const { Discord } = await import('./loaders/discord.loader');
      const discord = new Discord();
      await discord.init();
    }

    await (await import('./loaders/telegram.loader')).default();
    await (await import('./loaders/config.loader')).default();

    (await import('./loaders/worker.loader')).default();
  } catch (err) {
    console.error(err);
    if (process.env.MODE == 'production') {
      exitHandler.call(null, { exit: true });
    } else {
      process.exit(1);
    }
  }
})();
