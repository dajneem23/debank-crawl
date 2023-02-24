import puppeteer from 'puppeteer';
import { anonymizeProxy } from 'proxy-chain';
import { WEBSHARE_PROXY_STR } from '@/common/proxy';
import Container, { Token } from 'typedi';
import { Browser } from 'puppeteer';
import { DILogger } from './logger.loader';
export const puppeteerBrowserToken = new Token<Browser>('_puppeteerBrowser');
export const puppeteerLoader = async () => {
  const logger = Container.get(DILogger);
  try {
    const newProxyUrl = await anonymizeProxy(WEBSHARE_PROXY_STR);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', `--proxy-server=${newProxyUrl}`],
      ignoreHTTPSErrors: true,
      executablePath: '/usr/bin/google-chrome',
    });
    Container.set(puppeteerBrowserToken, browser);
    logger.success('success', 'Puppeteer');
  } catch (error) {
    logger.error(error, 'Puppeteer');
    throw error;
  }
};
