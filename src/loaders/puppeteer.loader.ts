import puppeteer from 'puppeteer-extra';
import { anonymizeProxy } from 'proxy-chain';
import { WEBSHARE_PROXY_STR } from '@/common/proxy';
import Container, { Token } from 'typedi';
import { Browser } from 'puppeteer';
import { DILogger } from './logger.loader';
import { executablePath } from 'puppeteer';

import pluginStealth from 'puppeteer-extra-plugin-stealth';

import { Cluster } from 'puppeteer-cluster';

export const puppeteerBrowserToken = new Token<Browser>('_puppeteerBrowser');
export const puppeteerLoader = async () => {
  const logger = Container.get(DILogger);
  try {
    const newProxyUrl = await anonymizeProxy(WEBSHARE_PROXY_STR);

    const browser = await puppeteer.use(pluginStealth()).launch({
      headless: process.env.MODE == 'production' || true,
      devtools: process.env.MODE != 'production',
      // userDataDir: './.cache',
      // defaultViewport: {
      //   width: 375,
      //   height: 667,
      //   isMobile: true,
      // },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        // `--proxy-server=${newProxyUrl}`,
        '--disable-web-security',
        '--disable-features=IsolateOrigins',
        '--disable-site-isolation-trials',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        // '--disable-gpu',
        '--use-gl=egl',
      ],
      ignoreHTTPSErrors: true,
      ...((process.env.MODE == 'production' && { executablePath: '/usr/bin/google-chrome' }) || {
        executablePath: executablePath(),
      }),
      //TODO: DISABLE THIS FOR PRODUCTION
      //use this for local development
      // executablePath: executablePath(),
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
    headless: process.env.MODE == 'production',
    userDataDir: './.cache',
    devtools: process.env.MODE != 'production',
    // defaultViewport: {
    //   width: 375,
    //   height: 667,
    //   isMobile: true,
    // },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      // `--proxy-server=${newProxyUrl}`,
      '--disable-web-security',
      '--disable-features=IsolateOrigins',
      '--disable-site-isolation-trials',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      // '--incognito',

      // '--autoplay-policy=user-gesture-required',
      // '--disable-background-timer-throttling',
      // '--disable-backgrounding-occluded-windows',
      // '--disable-breakpad',
      // '--disable-component-update',
      // '--disable-domain-reliability',
      // '--disable-extensions',
      // '--disable-features=AudioServiceOutOfProcess',
      // '--disable-hang-monitor',
      // '--disable-ipc-flooding-protection',
      // '--disable-notifications',
      // '--disable-offer-store-unmasked-wallet-cards',
      // '--disable-popup-blocking',
      // '--disable-print-preview',
      // '--disable-prompt-on-repost',
      // '--disable-renderer-backgrounding',
      // '--disable-setuid-sandbox',
      // '--hide-scrollbars',
      // '--ignore-gpu-blacklist',
      // '--metrics-recording-only',
      // '--mute-audio',
      // '--no-default-browser-check',
      // '--no-pings',
      // '--password-store=basic',
      // '--use-gl=swiftshader',
      // '--use-mock-keychain',
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

export const createPuppeteerBrowserContext = async () => {
  let browser;
  try {
    browser = Container.get(puppeteerBrowserToken);
  } catch (error) {
    browser = await createPuppeteerBrowser();
    Container.set(puppeteerBrowserToken, browser);
  }
  const context = await browser.createIncognitoBrowserContext();
  return context;
};
const puppeterrClusterToken = new Token<Cluster>('_puppeteerCluster');
export const createPupperteerClusterLoader = async () => {
  puppeteer.use(pluginStealth());
  const newProxyUrl = await anonymizeProxy(WEBSHARE_PROXY_STR);
  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: 3,
    retryLimit: 5,
    timeout: 1000 * 60 * 2,
    puppeteer,
    puppeteerOptions: {
      headless: process.env.MODE == 'production',
      devtools: process.env.MODE != 'production',
      userDataDir: './.cache',
      // defaultViewport: {
      //   width: 375,
      //   height: 667,
      //   isMobile: true,
      // },
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
        // '--disable-gpu',
        '--use-gl=egl',
      ],
      ignoreHTTPSErrors: true,
      ...((process.env.MODE == 'production' && { executablePath: '/usr/bin/google-chrome' }) || {
        executablePath: executablePath(),
      }),
    },
  });
  return cluster;
};
