import { DebankAPI } from '../../../common/api';
import { WEBSHARE_PROXY_HTTP, WEBSHARE_PROXY_RANKING_WHALE_TOPHOLDERS_HTTP } from '../../../common/proxy';
import { account, browser_uid, connected_dict, current_address } from '../debank.const';
import { logger, mgClient } from '../debank.config';
import { queuePortfolio, queueTopHolder } from '../debank.queue';
import {
  collectApiSign,
  getAccountSnapshotCrawlId,
  getDebankAPISign,
  getDebankCrawlId,
  getDebankTopHoldersCrawlId,
  insertDebankTopHolders,
  isValidTopHoldersData,
  queryDebankAllCoins,
  queryDebankTopHoldersImportantToken,
} from '../debank.fnc';
import { DebankJobNames } from '../debank.job';
import { sendTelegramMessage } from '../../../service/alert/telegram';
import { connectChrome, createPuppeteerBrowser } from '../../../service/puppeteer';
import { sleep } from '../../../utils/common';
import bluebird from 'bluebird';
import { uniqBy } from 'lodash';
import { Page } from 'puppeteer';
import { getRedisKey } from '../../../service/redis';

export const addFetchTopHoldersByUsersAddressJob = async () => {
  const { rows } = await queryDebankTopHoldersImportantToken();

  const crawl_id = await getDebankCrawlId();

  const NUM_ADDRESSES_PER_JOB = 5;
  const user_addresses_list = Array.from({ length: Math.ceil(rows.length / NUM_ADDRESSES_PER_JOB) }).map((_, i) => {
    return [
      ...rows
        .slice(i * NUM_ADDRESSES_PER_JOB, (i + 1) * NUM_ADDRESSES_PER_JOB)
        .map(({ user_address }: any) => user_address),
    ];
  });
  const jobs = user_addresses_list.map((user_addresses: any, index) => ({
    name: DebankJobNames['debank:crawl:portfolio:list'],
    data: {
      user_addresses,
      crawl_id,
    },
    opts: {
      jobId: `debank:crawl:portfolio:list:${crawl_id}:${index}`,
      removeOnComplete: {
        age: 60 * 60 * 6,
      },
      removeOnFail: {
        age: 60 * 60 * 6,
      },
      priority: 10,
      attempts: 10,
      // delay: 1000 * 5,
    },
  }));
  await queuePortfolio.addBulk(jobs);
  const countJobs = await queuePortfolio.getJobCounts();
  await sendTelegramMessage({
    message: `[debank-portfolio]\n
    [add-fetch-top-holders-by-users-address-job]\n
    ----------------------------------\n
    crawl_id::${crawl_id}\n
    - added::${jobs.length}\n
    - waiting::${countJobs.waiting}\n
    - delayed::${countJobs.delayed}\n
    - active::${countJobs.active}\n
    - ✅completed::${countJobs.completed}\n
    - ❌failed::${countJobs.failed}\n
    ----------------------------------\n
    `,
  });
};

export const fetchTopHoldersPage = async ({
  id,
  start = 0,
  limit = DebankAPI.Coin.top_holders.params.limit,
  crawl_id,
}: {
  id: string;
  start: number;
  limit: number;
  crawl_id: number;
}) => {
  try {
    const {
      data: { data, error_code },
      status,
    } = await DebankAPI.fetch({
      endpoint: DebankAPI.Coin.top_holders.endpoint,
      params: {
        id,
        start,
        limit,
      },
      config: {
        headers: {
          account,
        },
        proxy: {
          host: WEBSHARE_PROXY_HTTP.host,
          port: WEBSHARE_PROXY_HTTP.port,
          auth: {
            username: WEBSHARE_PROXY_RANKING_WHALE_TOPHOLDERS_HTTP.auth.username,
            password: WEBSHARE_PROXY_RANKING_WHALE_TOPHOLDERS_HTTP.auth.password,
          },
          protocol: WEBSHARE_PROXY_HTTP.protocol,
        },
      },
    });
    if (status !== 200 || error_code) {
      throw new Error('fetchTopHolders:error');
    }
    const { holders } = data;
    await insertDebankTopHolders({
      holders,
      crawl_id,
      id,
    });
    return {
      holders,
    };
  } catch (error) {
    logger.error('error', '[fetchTopHolders:error]', JSON.stringify(error));
    throw error;
  }
};
export const fetchTopHolders = async ({ id, crawl_id }: { id: string; crawl_id: number }) => {
  try {
    const {
      data: { data, error_code },
      status,
    } = await DebankAPI.fetch({
      endpoint: DebankAPI.Coin.top_holders.endpoint,
      params: {
        id,
      },
      config: {
        headers: {
          account,
        },
        proxy: {
          host: WEBSHARE_PROXY_HTTP.host,
          port: WEBSHARE_PROXY_HTTP.port,
          auth: {
            username: WEBSHARE_PROXY_RANKING_WHALE_TOPHOLDERS_HTTP.auth.username,
            password: WEBSHARE_PROXY_RANKING_WHALE_TOPHOLDERS_HTTP.auth.password,
          },
          protocol: WEBSHARE_PROXY_HTTP.protocol,
        },
      },
    });
    if (status !== 200 || error_code) {
      throw new Error('fetchTopHolders:error');
    }
    const { total_count, holders } = data;

    const listIndex = Array.from(Array(Math.ceil(total_count / DebankAPI.Coin.top_holders.params.limit))).reduce(
      (acc, _, index) => {
        acc.push(index * DebankAPI.Coin.top_holders.params.limit);
        return acc;
      },
      [],
    );

    listIndex.map((index: number) => {
      if (index === 0) return;
      queueTopHolder.add(
        DebankJobNames['debank:fetch:top-holders:page'],
        {
          id,
          start: index,
          limit: DebankAPI.Coin.top_holders.params.limit,
          crawl_id,
        },
        {
          jobId: `debank:fetch:top-holders:page:${crawl_id}:${id}:${index}`,
          removeOnComplete: true,
          removeOnFail: {
            age: 60 * 60 * 1,
          },
          priority: 7,
          attempts: 10,
        },
      );
    });
    await insertDebankTopHolders({
      holders,
      crawl_id,
      id,
    });
    const countJobs = await queueTopHolder.getJobCounts();
    await sendTelegramMessage({
      message: `[debank-top-holder]\n
      [fetch-top-holders]\n
      ----------------------------------\n
      crawl_id::${crawl_id}\n
      - added::${listIndex.length}\n
      - waiting::${countJobs.waiting}\n
      - delayed::${countJobs.delayed}\n
      - active::${countJobs.active}\n
      - ✅completed::${countJobs.completed}\n
      - ❌failed::${countJobs.failed}\n
      ----------------------------------\n
      `,
    });
  } catch (error) {
    logger.error('error', '[fetchTopHolders:error]', JSON.stringify(error));
    throw error;
  }
};
export const addFetchTopHoldersJob = async () => {
  try {
    const crawl_id = await getDebankTopHoldersCrawlId();
    const allCoins = await queryDebankAllCoins();
    //164
    const jobs = allCoins.map(({ symbol, db_id }) => ({
      name: DebankJobNames['debank:crawl:top-holders'],
      data: {
        id: db_id,
        crawl_id,
      },
      opts: {
        jobId: `debank:crawl:top-holders:${crawl_id}:${symbol}`,
        removeOnComplete: {
          age: 60 * 60 * 3,
        },
        removeOnFail: {
          age: 60 * 60 * 3,
        },
        priority: 5,
        delay: 1000 * 30,
        attempts: 10,
      },
    }));
    await queueTopHolder.addBulk(jobs);
    const countJobs = await queueTopHolder.getJobCounts();
    await sendTelegramMessage({
      message: `[debank-top-holder]\n
      [add-fetch-top-holders-job]\n
      ----------------------------------\n
      crawl_id::${crawl_id}\n
      - added::${jobs.length}\n
      - waiting::${countJobs.waiting}\n
      - delayed::${countJobs.delayed}\n
      - active::${countJobs.active}\n
      - ✅completed::${countJobs.completed}\n
      - ❌failed::${countJobs.failed}\n
      ----------------------------------\n
      `,
    });
  } catch (error) {
    logger.error('error', '[addFetchTopHoldersJob:error]', JSON.stringify(error));
    throw error;
  }
};
const fetchTopHoldersPageUsePuppeteer = async ({
  id,
  page,
  offset,
  retry = 3,
  timeout = 30 * 1000,
}: {
  id: string;
  page: Page;
  offset: number;
  retry?: number;
  timeout?: number;
}) => {
  try {
    const url = new URL(DebankAPI.Coin.top_holders.endpoint);
    url.searchParams.append('id', id);
    url.searchParams.append('start', offset.toString());
    url.searchParams.append('limit', DebankAPI.Coin.top_holders.params.limit.toString());
    const { api_nonce, api_sign, api_ts, api_ver } = await getDebankAPISign();
    const [_, data] = await Promise.all([
      page.evaluate(
        (url, { account, api_nonce, api_sign, api_ts, api_ver }) => {
          // @ts-ignore
          fetch(url, {
            headers: {
              account,
              'x-api-nonce': api_nonce,
              'x-api-sign': api_sign,
              'x-api-ts': api_ts,
              'x-api-ver': api_ver,
            },
            referrerPolicy: 'strict-origin-when-cross-origin',
            body: null,
            method: 'GET',
            mode: 'cors',
            credentials: 'include',
          }).then((res) => res.json());
        },
        url.toString(),
        {
          account,
          api_nonce,
          api_sign,
          api_ts,
          api_ver,
        },
      ),
      page.waitForResponse(
        async (response) => {
          return response.url().includes(url.toString());
        },
        {
          timeout,
        },
      ),
    ]);
    //check if response is valid
    await data.json();
    return data;
  } catch (error) {
    if (retry > 0) {
      await sleep(1000 * 10);

      return await fetchTopHoldersPageUsePuppeteer({
        offset,
        retry: retry - 1,
        page,
        id,
      });
    } else {
      throw error;
    }
  }
};
export const crawlTopHolders = async ({ id, crawl_id }: { id: string; crawl_id: number }) => {
  const browser = process.env.MODE == 'production' || true ? await connectChrome() : await createPuppeteerBrowser();
  // const browser = await createPuppeteerBrowser();
  // const context = await browser.createIncognitoBrowserContext();
  const context = await browser.defaultBrowserContext();
  let jobData = [];
  const page = await context.newPage();
  page.on('request', (request) => {
    collectApiSign({
      headers: request.headers(),
    });
  });
  try {
    //login proxy
    await page.authenticate({
      username: WEBSHARE_PROXY_HTTP.auth.username,
      password: WEBSHARE_PROXY_HTTP.auth.password,
    });
    //go to page and get total count
    const [_, data] = await Promise.all([
      page.goto(`https://debank.com/tokens/${id}/holders`, {
        waitUntil: 'load',
        timeout: 1000 * 60,
      }),
      page.waitForResponse((response) => {
        return response.url().includes(DebankAPI.Coin.top_holders.endpoint);
      }),
    ]);
    const dataJson = await data.json();
    const {
      data: { total_count },
    } = dataJson;
    //set localstorage
    await page.evaluate(
      ({ current_address, connected_dict, browser_uid }) => {
        // @ts-ignore
        window.localStorage.setItem('current_address', current_address);
        // @ts-ignore
        window.localStorage.setItem('connected_dict', connected_dict);
        // @ts-ignore
        window.localStorage.setItem('browser_uid', browser_uid);
      },
      {
        current_address,
        connected_dict,
        browser_uid,
      },
    );
    await page.reload();
    await sleep(15 * 1000);
    const listIndex = Array.from(Array(Math.ceil(total_count / DebankAPI.Coin.top_holders.params.limit))).reduce(
      (acc, _, index) => {
        acc.push(index * DebankAPI.Coin.top_holders.params.limit);
        return acc;
      },
      [],
    );

    await bluebird.map(
      listIndex,
      async (offset: number) => {
        const response = await fetchTopHoldersPageUsePuppeteer({
          offset,
          id,
          page,
        });
        const { data: dataJson } = await response.json();
        const { holders } = dataJson;
        jobData = uniqBy([...jobData, ...holders], 'id');
      },
      {
        concurrency: 3,
      },
    );
    if (!isValidTopHoldersData({ data: jobData, total_count })) {
      throw new Error('crawlTopHolders:invalid-data');
    }
    if (process.env.MODE == 'production') {
      await insertDebankTopHolders({
        holders: jobData,
        crawl_id,
        id,
      });
    }
  } catch (error) {
    logger.error('error', '[crawlTopHoldersByList:error]', JSON.stringify(error));
    throw error;
  } finally {
    //cleanup
    await page.close();
    // await context.close();
    await browser.close();
    // browser.disconnect();
  }
};
