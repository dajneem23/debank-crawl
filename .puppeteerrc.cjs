const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
  //TODO: enable when mac arm chromium is available
  ...(process.arch === 'arm64' && process.platform === 'darwin'
    ? {
        experiments: {
          macArmChromiumEnabled: true,
        },
      }
    : {}),
};
