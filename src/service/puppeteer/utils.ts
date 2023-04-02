import { WEBSHARE_PROXY_HOST, WEBSHARE_PROXY_STR } from '../../common/proxy';
import Container, { Token } from 'typedi';
import { Browser } from 'puppeteer';
import { executablePath } from 'puppeteer';
import { anonymizeProxy } from 'proxy-chain';
import pluginStealth from 'puppeteer-extra-plugin-stealth';
import puppeteer from 'puppeteer-extra';

export const puppeteerBrowserToken = new Token<Browser>('_puppeteerBrowser');

export const createPuppeteerBrowser = async (
  { proxy = WEBSHARE_PROXY_STR }: { proxy?: string } = {
    proxy: WEBSHARE_PROXY_STR,
  },
) => {
  const newProxyUrl = await anonymizeProxy(proxy);
  const browser = await puppeteer.use(pluginStealth()).launch({
    headless: process.env.MODE == 'production',
    userDataDir: './.cache',
    devtools: process.env.MODE != 'production',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      `--proxy-server=${newProxyUrl}`,
      '--disable-web-security',
      '--disable-features=IsolateOrigins',
      '--disable-site-isolation-trials',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      // '--incognito',
    ],
    ignoreHTTPSErrors: true,
    ...((process.env.MODE == 'production' && { executablePath: '/usr/bin/google-chrome' }) || {
      executablePath: executablePath(),
    }),
  });
  return browser;
};

export const connectChrome = async () => {
  const host = process.env.MODE == 'production' ? '10.104.0.3' : '167.172.79.230';
  const browser = await puppeteer.connect({
    browserWSEndpoint: `ws://${host}:9999?stealth`,
    defaultViewport: {
      width: 1920,
      height: 1080,
      isMobile: false,
    },
  });
  Container.set(puppeteerBrowserToken, browser);
  return browser;
};
