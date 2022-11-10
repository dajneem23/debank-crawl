import { env } from 'process';
import 'reflect-metadata';
/**
 *  @description this import is required to initialize service class
 */
/*eslint-disable */
import * as defillama from '@/modules/defillama';

import * as debank from '@/modules/debank';
/*eslint-disable */
(async () => {
  try {
    // ----------------------------------------------------------------
    // Load modules
    // ----------------------------------------------------------------

    // Logger
    (await import('./loaders/loggerLoader')).default();
    // Database (mongodb)
    await (await import('./loaders/mongoDBLoader')).default();
    await (await import('./loaders/awsS3Loader')).default();
    await (await import('./loaders/pgLoader')).default();

    if (env.MODE == 'production') {
      await (await import('./loaders/telegramLoader')).default();
      await (await import('./loaders/pgLoader')).default();
    }

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
