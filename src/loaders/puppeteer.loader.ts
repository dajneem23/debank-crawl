import puppeteer from 'puppeteer-extra';
import { anonymizeProxy } from 'proxy-chain';
import { WEBSHARE_PROXY_STR } from '@/common/proxy';
import Container, { Token } from 'typedi';
import { Browser } from 'puppeteer';
import { DILogger } from './logger.loader';
import { executablePath } from 'puppeteer';

import pluginStealth from 'puppeteer-extra-plugin-stealth';

export const puppeteerBrowserToken = new Token<Browser>('_puppeteerBrowser');
export const puppeteerLoader = async () => {
  const logger = Container.get(DILogger);
  try {
    const newProxyUrl = await anonymizeProxy(WEBSHARE_PROXY_STR);

    const browser = await puppeteer.use(pluginStealth()).launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox', `--proxy-server=${newProxyUrl}`],
      ignoreHTTPSErrors: true,
      ...((process.env.MODE == 'production' && { executablePath: '/usr/bin/google-chrome' }) || {
        executablePath: executablePath(),
      }),
      //use this for local development
      executablePath: executablePath(),
    });
    Container.set(puppeteerBrowserToken, browser);
    logger.success('success', 'Puppeteer');
  } catch (error) {
    logger.error(error, 'Puppeteer');
    throw error;
  }
};
export const createPuppeteerBrowser = async () => {
  const newProxyUrl = await anonymizeProxy(WEBSHARE_PROXY_STR);
  const browser = await puppeteer.use(pluginStealth()).launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      `--proxy-server=${newProxyUrl}`,
      '--disable-web-security',
      '--disable-features=IsolateOrigins',
      '--disable-site-isolation-trials',
    ],
    ignoreHTTPSErrors: true,
    ...((process.env.MODE == 'production' && { executablePath: '/usr/bin/google-chrome' }) || {
      executablePath: executablePath(),
    }),
    //TODO: DISABLE THIS FOR PRODUCTION
    //use this for local development
    // executablePath: executablePath(),
  });
  return browser;
};
