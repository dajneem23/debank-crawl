import { sendTelegramMessage } from '../../../service/alert/telegram';
import { queueInsert, queuePortfolio } from '../debank.queue';
import { connectChrome, createPuppeteerBrowser } from '../../../service/puppeteer';
import { WEBSHARE_PROXY_HTTP } from '../../../common/proxy';
import bluebird from 'bluebird';
import {
  bulkWriteUsersProject,
  getAccountsFromTxEvent,
  getDebankCrawlId,
  isValidPortfolioData,
  pageDebankFetchProfileAPI,
  updateDebankUserProfile,
} from '../debank.fnc';
import { logger, mgClient } from '../debank.config';
import { DebankJobNames } from '../debank.job';
import { sleep } from '../../../utils/common';
import { DebankAPI } from '../../../common/api';
import { Page } from 'puppeteer';
import { chain } from 'lodash';
import { setExpireRedisKey, setRedisKey } from '../../../service/redis';
export const fetchUserProfile = async ({ address }: { address: string }) => {
  const {
    data: { data, error_code },
    status,
  } = await DebankAPI.fetch({
    endpoint: DebankAPI.User.addr.endpoint,
    params: {
      addr: address,
    },
  });
  if (status !== 200 || error_code || !data) {
    throw new Error('fetchUserProfile:error');
  }
  return { data };
};

export const updateUserProfileJob = async ({ address }: { address: string }) => {
  try {
    const { data } = await fetchUserProfile({ address });
    await updateDebankUserProfile({ address, profile: data });
  } catch (error) {
    logger.error('error', '[updateUserProfileJob:error]', JSON.stringify(error));
    throw error;
  }
};
export const crawlUsersProject = async ({ user_addresses }: { user_addresses: string[] }) => {
  const browser = await (process.env.MODE === 'production' ? connectChrome() : createPuppeteerBrowser());
  const context = browser.defaultBrowserContext();
  const jobData = Object.fromEntries(user_addresses.map((k) => [k, {} as any]));
  const page = await context.newPage();
  await page.authenticate({
    username: WEBSHARE_PROXY_HTTP.auth.username,
    password: WEBSHARE_PROXY_HTTP.auth.password,
  });
  await page.goto(`https://debank.com/profile/${user_addresses[0]}`, {
    waitUntil: 'load',
    timeout: 1000 * 60,
  });
  try {
    await bluebird.map(
      user_addresses,
      async (user_address) => {
        try {
          const project_list = await pageDebankFetchProfileAPI({
            url: `https://api.debank.com/portfolio/project_list?user_addr=${user_address}`,
            page,
            user_address,
          });
          if (project_list.status() != 200) {
            throw new Error('crawlUsersProject:response:not 200');
          }
          const { data: project_list_data } = await project_list.json();
          jobData[user_address]['project_list'] = project_list_data;
        } catch (error) {
          logger.discord('error', '[crawlUsersProject:page:error]', JSON.stringify(error));
          throw error;
        }
      },
      {
        concurrency: 5,
      },
    );

    if (
      Object.values(jobData).some((data) => {
        return !(data && data.project_list);
      })
    ) {
      throw new Error('crawlUsersProject:mismatch-data');
    }

    //TODO: bulk insert to job queue
    if (process.env.MODE == 'production') {
      const mgData = Object.entries(jobData)
        .map(([user_address, { project_list: projects }]) => ({
          address: user_address,
          projects,
          portfolio_item_list: projects
            .map(({ portfolio_item_list = [] }) => {
              return portfolio_item_list.map(({ stats, ...rest }) => ({
                ...rest,
                stats,
                usd_value: stats.asset_usd_value,
                net_value: stats.net_usd_value,
                debt_value: stats.debt_usd_value,
              }));
            })
            .flat(),
          crawl_time: new Date(),
        }))
        .map(({ portfolio_item_list, ...rest }) => ({
          ...rest,
          portfolio_item_list,
          total_usd_value: portfolio_item_list.reduce((acc, { usd_value }) => acc + usd_value, 0),
          total_net_usd_value: portfolio_item_list.reduce((acc, { net_value }) => acc + net_value, 0),
          total_debt_usd_value: portfolio_item_list.reduce((acc, { debt_value }) => acc + debt_value, 0),
        }));
      await bulkWriteUsersProject(mgData);
    }
  } catch (error) {
    logger.error('error', '[crawlUsersProject:error]', JSON.stringify(error));
    throw error;
  } finally {
    await page.close();
    // await context.close();
    browser.disconnect();
  }
};

export const addSnapshotUsersProjectJob = async () => {
  const accounts = await getAccountsFromTxEvent();
  const crawl_id = await getDebankCrawlId();

  const NUM_ADDRESSES_PER_JOB = 5;
  const user_addresses_list = Array.from({ length: Math.ceil(accounts.length / NUM_ADDRESSES_PER_JOB) }).map((_, i) => {
    return [...accounts.slice(i * NUM_ADDRESSES_PER_JOB, (i + 1) * NUM_ADDRESSES_PER_JOB)];
  });
  const jobs = user_addresses_list.map((user_addresses: any, index) => ({
    name: DebankJobNames['debank:crawl:portfolio:list'],
    data: {
      user_addresses,
      crawl_id: +crawl_id,
    },
    opts: {
      jobId: `'debank:crawl:portfolio:list:${crawl_id}:${index}`,
      removeOnComplete: {
        age: 60 * 30,
      },
      removeOnFail: {
        age: 60 * 30,
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
    [add-snapshot-users-portfolio-job]\n
    ----------------------------------\n
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
export const crawlPortfolioByList = async ({
  user_addresses,
  crawl_id,
}: {
  user_addresses: string[];
  crawl_id: string;
}) => {
  const runAt = new Date();
  const browser = await (process.env.MODE === 'production' ? connectChrome() : createPuppeteerBrowser());
  const context = await browser.createIncognitoBrowserContext();
  const _user_addresses = await Promise.all(
    user_addresses.filter(async (user_address) => {
      const user = await mgClient.db('onchain').collection('account-snapshot').findOne({
        address: user_address,
        crawl_id: +crawl_id,
      });
      return !user;
    }),
  );
  if (_user_addresses.length == 0) {
    return {
      status: 'skipped',
    };
  }
  const jobData = Object.fromEntries(_user_addresses.map((k) => [k, {} as any]));
  const page = await context.newPage();
  await page.authenticate({
    username: WEBSHARE_PROXY_HTTP.auth.username,
    password: WEBSHARE_PROXY_HTTP.auth.password,
  });
  let api_nonce = '';
  let api_sign = '';
  let api_ts = '';
  let api_ver = '';
  page.on('request', (request) => {
    const headers = request.headers();
    if (headers['x-api-nonce']) {
      api_nonce = headers['x-api-nonce'];
    }
    if (headers['x-api-sign']) {
      api_sign = headers['x-api-sign'];
    }
    if (headers['x-api-ts']) {
      api_ts = headers['x-api-ts'];
    }
    if (headers['x-api-ver']) {
      api_ver = headers['x-api-ver'];
    }
    if (api_nonce && api_sign && api_ts && api_ver) {
      setExpireRedisKey({
        key: 'debank:api:nonce',
        expire: 60 * 5,
        value: api_nonce,
      });
      setExpireRedisKey({
        key: 'debank:api:sign',
        expire: 60 * 5,
        value: api_sign,
      });
      setExpireRedisKey({
        key: 'debank:api:ts',
        expire: 60 * 5,
        value: api_ts,
      });
      setExpireRedisKey({
        key: 'debank:api:ver',
        expire: 60 * 5,
        value: api_ver,
      });
    }
  });
  await page.goto(`https://debank.com/profile/${_user_addresses[0]}`, {
    waitUntil: 'load',
    timeout: 1000 * 60,
  });
  try {
    await bluebird.map(
      _user_addresses,
      async (user_address) => {
        try {
          const { used_chains } = await crawlDebankUserProfile({
            page,
            user_address,
          });
          const [balance_list, project_list] = await Promise.all([
            crawlUserBalance({
              page,
              user_address,
              chains: used_chains,
            }),
            crawlUserProjectList({
              page,
              user_address,
            }),
          ]);
          jobData[user_address]['balance_list'] = balance_list;
          jobData[user_address]['project_list'] = project_list;
        } catch (error) {
          logger.discord('error', '[crawlPortfolio:page:error]', JSON.stringify(error));
          throw error;
        }
      },
      {
        concurrency: 2,
      },
    );

    if (
      Object.values(jobData).some((data) => {
        return !isValidPortfolioData(data);
      })
    ) {
      throw new Error('crawlPortfolio:mismatch-data');
    }
  } catch (error) {
    logger.error('error', '[crawlPortfolioByList:-1:error]', JSON.stringify(error));
    throw error;
  } finally {
    //TODO: bulk insert to job queue
    const jobs = Object.entries(jobData)
      .map(([user_address, data]) => {
        if (!isValidPortfolioData(data)) {
          return;
        }
        return {
          name: DebankJobNames['debank:insert:user-assets-portfolio'],
          data: {
            ...data,
            crawl_id,
            user_address,
          },
          opts: {
            jobId: `debank:insert:user-assets-portfolio:${user_address}:${crawl_id}`,
            removeOnComplete: {
              // remove job after 1 hour
              age: 60 * 30,
            },
            removeOnFail: {
              age: 60 * 60 * 1,
            },
            priority: 10,
            attempts: 10,
          },
        };
      })
      .filter(Boolean);
    if (process.env.MODE == 'production') {
      queueInsert.addBulk(jobs);
    }
    await page.close();
    await context.close();
    await browser.close();
    await mgClient
      .db('onchain-log')
      .collection('account-snapshot')
      .insertOne({
        crawl_id,
        user_addresses,
        _user_addresses,
        created_at: new Date(),
        run: {
          runAt,
          finishedAt: new Date(),
          time: new Date().getTime() - runAt.getTime(),
        },
        jobs,
        jobData,
      });
    // return jobs.map((job) => job.opts.jobId);
  }
};

export const crawlDebankUserProfile = async ({ user_address, page }: { user_address: string; page: Page }) => {
  const data = await pageDebankFetchProfileAPI({
    url: `https://api.debank.com/user/addr?addr=${user_address}`,
    page,
    user_address,
  });
  if (data.status() != 200) {
    throw new Error('crawlDebankUserProfile:response:not 200');
  }
  const { data: profile } = await data.json();
  if (!profile) {
    throw new Error('crawlDebankUserProfile:response:profile-not-found');
  }
  await mgClient
    .db('onchain')
    .collection('debank-user')
    .findOneAndUpdate(
      {
        address: user_address,
      },
      {
        $set: {
          ...profile,
          updated_at: new Date(),
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
      },
    );
  return profile;
};

export const crawlUserBalance = async ({
  page,
  user_address,
  chains,
}: {
  page: Page;
  user_address: string;
  chains: any[];
}) => {
  const balance_list = await bluebird.map(
    chains,
    async (chain, index) => {
      await sleep(500 * index);
      const balance_list = await pageDebankFetchProfileAPI({
        url: `https://api.debank.com/token/balance_list?user_addr=${user_address}&chain=${chain}`,
        page,
        user_address,
      });
      if (balance_list.status() != 200) {
        throw new Error(`crawlPortfolio:response:not 200:${balance_list.status()}`);
      }
      const { data: balance_list_data } = await balance_list.json();
      return balance_list_data;
    },
    {
      concurrency: 2,
    },
  );
  return balance_list.flat();
};

export const crawlUserProjectList = async ({ page, user_address }: { page: Page; user_address: string }) => {
  const project_list = await pageDebankFetchProfileAPI({
    url: `https://api.debank.com/portfolio/project_list?user_addr=${user_address}`,
    page,
    user_address,
  });
  if (project_list.status() != 200) {
    throw new Error(`crawlPortfolio:response:not 200:${project_list.status()}`);
  }
  const { data: project_list_data } = await project_list.json();
  return project_list_data;
};

export const crawlUserAssetList = async ({ page, user_address }: { page: Page; user_address: string }) => {
  const assets = await pageDebankFetchProfileAPI({
    url: `https://api.debank.com/asset/classify?user_addr=${user_address}`,
    page,
    user_address,
  });
  if (assets.status() != 200) {
    throw new Error(`crawlPortfolio:response:not 200:${assets.status()}`);
  }
  const { data } = await assets.json();
  return data;
};
// crawlPortfolioByList({
//   user_addresses: ['0xbdfa4f4492dd7b7cf211209c4791af8d52bf5c50'],
//   crawl_id: 'test',
// });
