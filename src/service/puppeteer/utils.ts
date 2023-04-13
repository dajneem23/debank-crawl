import { WEBSHARE_PROXY_HOST, WEBSHARE_PROXY_STR } from '@/common/proxy';
import Container, { Token } from 'typedi';
import { Browser } from 'puppeteer';
import { executablePath } from 'puppeteer';
import { anonymizeProxy } from 'proxy-chain';
import pluginStealth from 'puppeteer-extra-plugin-stealth';
import puppeteer from 'puppeteer-extra';
import axios from 'axios';
import { INTERNAL_HOST, LIMIT_CPU, LIMIT_RUNNING, PUBLIC_HOST } from './const';

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

export const connectChrome = async (
  {
    host,
  }: {
    host?: string;
  } = {
    host: '',
  },
) => {
  const _host = host || (await selectBestServer());
  const browser = await puppeteer.connect({
    browserWSEndpoint: `ws://${_host}:9999?stealth`,
    defaultViewport: {
      width: 1920,
      height: 1080,
      isMobile: false,
    },
  });
  Container.set(puppeteerBrowserToken, browser);
  return browser;
};

export const getSeverPressure = async (host) => {
  const { data, status } = await axios.get(`http://${host}:9999/pressure`);
  if (status == 200) {
    const { pressure } = data;
    return pressure;
  }
  return null;
};

export const selectBestServer = async () => {
  const host = process.env.MODE == 'production' ? INTERNAL_HOST : PUBLIC_HOST;
  const pressure = await Promise.all(host.map((h) => getSeverPressure(h)));
  const cpu = pressure.map(({ cpu, running }, index) => {
    //last index is crawler server
    if (index == pressure.length - 1) {
      return cpu;
    }
    if (cpu >= LIMIT_CPU || running >= LIMIT_RUNNING) {
      return 200;
    }
    return cpu;
  });
  const index = cpu.indexOf(Math.min(...cpu));
  return host[index];
};
