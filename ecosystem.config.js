module.exports = {
  apps: [
    {
      name: 'cronjob-debank',
      script: 'build/server.js',
      exec_mode: 'cluster',
      instances: '2',
      max_memory_restart: '2G',
      env: {
        NODE_OPTIONS: '--max-old-space-size=4096',
        NODE_ENV: 'production',
      },
    },
  ],
};
