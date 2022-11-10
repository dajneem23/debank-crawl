import { env } from 'process';
import 'reflect-metadata';

(async () => {
  try {
    // ----------------------------------------------------------------
    // Load modules
    // ----------------------------------------------------------------

    // Logger
    (await import('./loaders/loggerLoader')).default();
    // Database (mongodb)
    await (await import('./loaders/mongoDBLoader')).default();

    // if (env.MODE == 'production') {
    await (await import('./loaders/pgLoader')).default();
    await (await import('./loaders/telegramLoader')).default();
    // await import('./loaders/discordLoader');
    // }

    // Caching (Redis)
    await (await import('./loaders/redisClientLoader')).default();
    // Express application
    const app = (await import('./loaders/expressLoader')).default();

    // ----------------------------------------------------------------
    // Start server
    // ----------------------------------------------------------------

    app.listen(app.get('port'), () => {
      console.info(`
#################################################################
  - Name: ${app.get('name')}
  - Version: ${app.get('version')}
  - Environment: ${app.get('env')}
  - Host: ${app.get('host')}:${app.get('port')}
  - Database (Mongodb): wikiblock
#################################################################
      `);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
