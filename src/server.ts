import 'reflect-metadata';

(async () => {
  try {
    // ----------------------------------------------------------------
    // Load modules
    // ----------------------------------------------------------------

    // Logger
    (await import('./loaders/loggerLoader')).default();
    // Database (PostgreDB)
    await (await import('./loaders/postgresDBLoader')).default();
    // Caching (Redis)
    // await (await import('./loaders/redisClientLoader')).default();
    // Express application
    const app = (await import('./loaders/expressLoader')).default();

    // AWS S3
    await (await import('./loaders/awsS3Loader')).default();
    // Jobs

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
  - Database (Postgres): ${app.get('db_name')}
#################################################################
      `);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
