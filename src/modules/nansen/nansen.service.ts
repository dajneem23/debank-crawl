import Logger from '@/core/logger';
import { pgClientToken, pgpToken } from '@/loaders/pg.loader';
import { createPuppeteerBrowser } from '@/loaders/puppeteer.loader';
import { sleep } from '@/utils/common';
import { bulkInsert, bulkInsertOnConflict } from '@/utils/pg';
import Container, { Token } from 'typedi';
import fs from 'fs';
import { dirname } from 'path';
import { uniq, uniqBy } from 'lodash';
import bluebird from 'bluebird';
import { Page } from 'puppeteer';
import { isJSON } from '@/utils/text';

export const NansenServiceToken = new Token<NansenService>('NansenService');
import inserted from './output/inserted.json';
const pgClient = Container.get(pgClientToken);
export class NansenService {
  private logger = new Logger('Nansen');

  constructor() {
    // this.crawlSmartMoneyOfTokens().then(() => {
    // console.log('done');
    // });
  }

  public async init() {
    // console.log('NansenService instantiated');
  }

  async crawlSmartMoney({ token_address, symbol, page }: { token_address: string; symbol: string; page: Page }) {
    // const context = await browser.createIncognitoBrowserContext();
    const data = [];
    try {
      await page.goto(`https://pro.nansen.ai/auth/login`, {
        waitUntil: 'networkidle2',
        timeout: 2 * 60 * 1000,
      });

      await page.setViewport({
        width: 1920,
        height: 1080,
      });
      await sleep(10 * 1000);
      // if (page.url().includes('auth/login')) {
      //   await page.type('#email', process.env.NANSEN_USERNAME, {
      //     delay: 100,
      //   });
      //   await page.type('#password', process.env.NANSEN_PASSWORD, {
      //     delay: 300,
      //   });
      //   await Promise.all([page.click('button[type=submit]'), page.waitForNavigation({ waitUntil: 'load' })]);
      // }
      const [_, token_profiler_holdingsBase64] = await Promise.all([
        page.goto(`https://pro.nansen.ai/smart-money-token-profiler?token_address=${token_address}`, {
          waitUntil: 'networkidle2',
          timeout: 2 * 60 * 1000,
        }),
        page.waitForResponse(
          (res) => {
            return res
              .url()
              .includes(
                'https://zarya-backend-mediator-pidzqxgs7a-uc.a.run.app/v1/questions/sm_token_profiler_holdings?',
              );
          },
          {
            timeout: 2 * 60 * 1000,
          },
        ),
      ]);

      const { x, y } = await page.evaluate(() => {
        const element =
          // @ts-ignore
          document.querySelector('button[data-cy="sm-token-profiler-holdings-page-right-button"]') ||
          // @ts-ignore
          document.querySelector('#sm_token_profiler_holdings');
        const { x, y } = element?.getBoundingClientRect();
        return { x, y };
      });
      // console.log({ x, y });
      const mouse = page.mouse;
      await mouse.move(x, y);
      await mouse.click(x, y);
      const { message } = await token_profiler_holdingsBase64.json();
      // console.log(message);
      if (isJSON(Buffer.from(message, 'base64').toString('utf8'))) {
        const { result_data } = JSON.parse(Buffer.from(message, 'base64').toString('utf8'));
        // console.log(uniqBy(result_data, 'address').length);

        const output = uniqBy(result_data, 'address').map(({ address, address_name: name, token_address }: any) => {
          return {
            address,
            name,
            // tokens: [symbol],
            // token_addresses: [token_address],
          };
        });
        if (output.length > 0) {
          await bulkInsertOnConflict({
            table: 'nansen-smart-money',
            data: output,
            conflict: 'address',
            onConflict: 'nothing',
          });
        }
        inserted[token_address] = output.map((item) => item.address);

        fs.writeFileSync(__dirname + `/output/inserted.json`, JSON.stringify(inserted));
      }
    } catch (error) {
      this.logger.error('error', '[NansenService]:crawlSmartMoney', error);
      throw error;
    } finally {
      // console.log('done', symbol);
    }
  }

  async crawlSmartMoneyOfTokens() {
    try {
      const browser = await createPuppeteerBrowser();
      const page: Page = await browser.newPage();
      // console.log('start crawling smart money of tokens', Object.keys(inserted).length);
      const { rows } = await pgClient.query(`SELECT address,symbol FROM "nansen-tokens"`);
      await bluebird.map(
        rows,
        async ({ address, symbol }, index) => {
          if (Object.keys(inserted).includes(address)) {
            // console.log('skipped', symbol);
            return;
          }
          // console.time(`${address} - ${symbol}-${index}`);
          await this.crawlSmartMoney({ token_address: address, symbol, page });
          // console.timeEnd(`${address} - ${symbol}-${index}`);
          await sleep(30 * 1000);
        },
        {
          concurrency: 1,
        },
      );
      await browser.close();
      await page.close();
    } catch (error) {
    } finally {
      fs.writeFileSync(__dirname + `/output/inserted.json`, JSON.stringify(inserted));
      // console.log('finished');
    }
  }
}
