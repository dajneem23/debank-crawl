module.exports = {
  apps: [
    {
      name: 'cronjob-debank',
      script: 'build/server.js',
      exec_mode: 'cluster',
      instances: '2',
      max_memory_restart: '1G',
      env: {
        NODE_OPTIONS: '--max-old-space-size=1024',
        NODE_ENV: 'production',
      },
    },
  ],
};
