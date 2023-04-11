import { HTTPResponse, Page } from 'puppeteer';
import { sleep } from '@/utils/common';
import { uniqBy } from 'lodash';
import { getRedisKey, setExpireRedisKey } from '@/service/redis';

export const pageDebankFetchProfileAPI = async ({
  page,
  url,
  retry = 5,
  timeout = 30 * 1000,
  user_address,
}: {
  page: Page;
  url: string;
  retry?: number;
  timeout?: number;
  user_address: string;
}): Promise<HTTPResponse> => {
  try {
    // console.log('pageDebankFetchProfileAPI', { url, user_address, retry });
    const { api_nonce, api_sign, api_ts, api_ver } = await getDebankAPISign();
    const [_, data] = await Promise.all([
      page.evaluate(
        (url, { api_nonce, api_sign, api_ts, api_ver }) => {
          // @ts-ignore-start
          fetch(url, {
            referrerPolicy: 'strict-origin-when-cross-origin',
            body: null,
            headers: {
              'x-api-nonce': api_nonce,
              'x-api-sign': api_sign,
              'x-api-ts': api_ts,
              'x-api-ver': api_ver,
            },
            method: 'GET',
            mode: 'cors',
            credentials: 'include',
          }).then((res) => res.json());
          // @ts-ignore-end
        },
        url,
        {
          api_nonce,
          api_sign,
          api_ts,
          api_ver,
        },
      ),
      page.waitForResponse(
        async (response) => {
          return response.url().includes(url);
        },
        {
          timeout,
        },
      ),
    ]);
    if (data.status() != 200) {
      throw new Error(`response status is not 200: ${data.status()}: ${data.url()}`);
    }
    //check if response is valid
    await data.json();

    return data;
  } catch (error) {
    if (retry > 0) {
      await sleep(10 * 1000);
      await page.goto(`https://debank.com/profile/${user_address}`, {
        timeout: 1000 * 60,
      });
      // await page.reload();
      return await pageDebankFetchProfileAPI({ url, retry: retry - 1, page, user_address, timeout });
    } else {
      throw error;
    }
  }
};

export const isValidPortfolioData = (data: any) => {
  return data && data.balance_list && data.project_list;
};

export const getValidPortfolioData = (data: any) => {
  return data.filter((item: any) => isValidPortfolioData(item));
};

export const isValidTopHoldersData = ({ data, total_count }: { data: any[]; total_count: number }) => {
  return data && uniqBy(data, 'id').length == total_count;
};

export const collectApiSign = async ({ headers }: { headers: any }) => {
  let api_nonce = '';
  let api_sign = '';
  let api_ts = '';
  let api_ver = '';
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
      key: 'debank:api',
      expire: 60 * 5,
      value: JSON.stringify({ api_nonce, api_sign, api_ts: +api_ts, api_ver }),
    });
  }
};
export const getDebankAPISign = async () => {
  const debank_api = await getRedisKey('debank:api');
  const { api_nonce, api_sign, api_ts, api_ver } = debank_api
    ? JSON.parse(debank_api)
    : {
        api_nonce: '',
        api_sign: '',
        api_ts: '',
        api_ver: '',
      };
  return {
    api_nonce,
    api_sign,
    api_ts,
    api_ver,
  };
};
