import { JobsOptions } from 'bullmq';
import { DebankAPI } from '@/common/api';
import { logger } from '../debank.config';
import { DebankJobNames } from '../debank.job';
import { queueWhale } from '../debank.queue';
import { sendTelegramMessage } from '@/service/alert/telegram';
import { WEBSHARE_PROXY_HTTP, WEBSHARE_PROXY_RANKING_WHALE_TOPHOLDERS_HTTP } from '@/common/proxy';
import { createPuppeteerBrowser } from '@/service/puppeteer';
import { account } from '../debank.const';
import { sleep } from '@/utils/common';
import { uniqBy } from 'lodash';
import bluebird from 'bluebird';
import { getDebankWhalesCrawlId, insertDebankWhaleList } from '../service/pg';

export const fetchWhaleList = async (
  {
    start = 0,
    limit = DebankAPI.Whale.list.params.limit,
    order_by = DebankAPI.Whale.list.params.order_by,
  }: {
    start: number;
    limit: number;
    order_by: string;
  } = DebankAPI.Whale.list.params,
) => {
  try {
    const {
      data: { data, error_code },
      status,
    } = await DebankAPI.fetch({
      endpoint: DebankAPI.Whale.list.endpoint,
      params: {
        start,
        limit,
        order_by,
      },
      config: {
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
      throw new Error('fetchWhaleList:fetch:fail');
    }
    const { whales, total_count } = data;
    return {
      whales,
      total_count,
      start,
      limit,
    };
  } catch (error) {
    logger.alert('error', '[fetchWhaleList:error]', JSON.stringify(error));
    throw error;
  }
};

export const fetchWhalesPage = async ({ start, crawl_id }: { start: number; crawl_id: number }) => {
  try {
    const { whales, total_count } = await fetchWhaleList({
      start,
      limit: DebankAPI.Whale.list.params.limit,
      order_by: DebankAPI.Whale.list.params.order_by,
    });
    if (!whales.length) {
      return;
    }
    //insert all whale list
    await insertDebankWhaleList({ whales, crawl_id });
  } catch (error) {
    logger.alert('error', '[fetchWhalesPage:error]', JSON.stringify(error));
    throw error;
  }
};

export const addFetchWhalesPagingJob = async () => {
  try {
    const crawl_id = await getDebankWhalesCrawlId();

    const { whales, total_count } = await fetchWhaleList({
      start: 0,
      limit: DebankAPI.Whale.list.params.limit,
      order_by: DebankAPI.Whale.list.params.order_by,
    });

    //create list index from total count divine limit each list index will be a job
    const listIndex = Array.from(Array(Math.ceil(total_count / DebankAPI.Whale.list.params.limit))).reduce(
      (acc, _, index) => {
        acc.push(index * DebankAPI.Whale.list.params.limit);
        return acc;
      },
      [],
    );
    //create job for each list index
    const jobs: {
      name: DebankJobNames;
      data: any;
      opts: JobsOptions;
    }[] = listIndex.map((index: number) => ({
      name: DebankJobNames['debank:fetch:whales:page'],
      data: {
        start: index,
        crawl_id,
      },
      opts: {
        jobId: `debank:fetch:whales:page:${crawl_id}:${index}`,
        removeOnComplete: true,
        removeOnFail: {
          age: 60 * 30,
        },

        delay: 1000 * 30,

        priority: 5,
        attempts: 10,
      },
    }));
    await queueWhale.addBulk(jobs);
    await insertDebankWhaleList({ whales, crawl_id });
    const countJobs = await queueWhale.getJobCounts();
    await sendTelegramMessage({
      message: `[debank-whale]\n
      [add-fetch-whales-paging-job]\n
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
    logger.alert('error', '[addFetchWhalesPagingJob:error]', JSON.stringify(error));
    throw error;
  }
};
export const crawlWhales = async ({ crawl_id }: { crawl_id: number }) => {
  // const browser = await connectChrome();
  const browser = await createPuppeteerBrowser();
  const context = await browser.createIncognitoBrowserContext();
  let jobData = [];
  const page = await context.newPage();
  try {
    //login proxy
    await page.authenticate({
      username: WEBSHARE_PROXY_HTTP.auth.username,
      password: WEBSHARE_PROXY_HTTP.auth.password,
    });
    //go to page and get total count
    const [_, data] = await Promise.all([
      page.goto(`https://debank.com/whales`, {
        waitUntil: 'load',
      }),
      page.waitForResponse((response) => {
        return response.url().includes(DebankAPI.Whale.list.endpoint);
      }),
    ]);
    const dataJson = await data.json();
    const {
      data: { total_count },
    } = dataJson;
    const listIndex = Array.from(Array(Math.ceil(total_count / DebankAPI.Whale.list.params.limit))).reduce(
      (acc, _, index) => {
        acc.push(index * DebankAPI.Whale.list.params.limit);
        return acc;
      },
      [],
    );

    const fetchWhalesPage = async ({
      offset,
      retry = 3,
      timeout = 30 * 1000,
    }: {
      offset: number;
      retry?: number;
      timeout?: number;
    }) => {
      try {
        const url = new URL(DebankAPI.Whale.list.endpoint);
        url.searchParams.append('start', offset.toString());
        url.searchParams.append('limit', DebankAPI.Whale.list.params.limit.toString());
        url.searchParams.append('order_by', '-usd_value');
        const [_, data] = await Promise.all([
          page.evaluate(
            (url, account) => {
              // @ts-ignore-start
              fetch(url, {
                headers: {
                  account,
                },
                referrerPolicy: 'strict-origin-when-cross-origin',
                body: null,
                method: 'GET',
                mode: 'cors',
                credentials: 'include',
              }).then((res) => res.json());
              // @ts-ignore-end
            },
            url.toString(),
            account,
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
        await sleep(1000);
        return data;
      } catch (error) {
        if (retry > 0) {
          await fetchWhalesPage({ offset, retry: retry - 1 });
        } else {
          throw error;
        }
      }
    };

    await bluebird.map(
      listIndex,
      async (offset: number) => {
        const response = await fetchWhalesPage({
          offset,
        });
        const { data: dataJson } = await response.json();
        const { whales } = dataJson;
        jobData = uniqBy([...jobData, ...whales], 'id');
        // console.log('jobData', jobData.length);
      },
      {
        concurrency: 3,
      },
    );
    // console.log('jobData', uniq(jobData.map((item) => item.id)).length);
    // if (!this.isValidTopHoldersData({ data: jobData, total_count })) {
    //   throw new Error('crawlTopHolders:invalid-data');
    // }
    if (process.env.MODE == 'production') {
      // await this.insertTopHolders({
      //   holders: jobData,
      //   crawl_id,
      //   symbol: id,
      // });
    }
  } catch (error) {
    logger.error('error', '[crawlWhales:error]', JSON.stringify(error));
    throw error;
  } finally {
    //cleanup
    await page.close();
    await context.close();
    // await browser.close();
    browser.disconnect();
  }
};
