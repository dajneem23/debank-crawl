import { DebankAPI } from '@/common/api';
import { getDebankCoinsCrawlId, insertDebankCoins } from '../debank.fnc';
import { WEBSHARE_PROXY_HTTP, WEBSHARE_PROXY_RANKING_WHALE_TOPHOLDERS_HTTP } from '@/common/proxy';
import { logger } from '../debank.config';

export const fetchCoins = async () => {
  try {
    const {
      data: { data, error_code },
      status,
    } = await DebankAPI.fetch({
      endpoint: DebankAPI.Coin.list.endpoint,
    });
    if (status !== 200 || error_code) {
      throw new Error('fetchCoins:error');
    }
    const { coins } = data;
    return {
      coins,
    };
  } catch (error) {
    logger.error('error', '[fetchCoins:error]', JSON.stringify(error));
    throw error;
  }
};

export const addFetchCoinsJob = async () => {
  try {
    const crawl_id = await getDebankCoinsCrawlId();
    const {
      data: { data, error_code },
      status,
    } = await DebankAPI.fetch({
      endpoint: DebankAPI.Coin.list.endpoint,
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
      throw new Error('addFetchCoinsJob:error');
    }
    const { coins } = data;
    await insertDebankCoins({
      coins,
      crawl_id,
    });
  } catch (error) {
    logger.error('error', '[addFetchCoinsJob:error]', JSON.stringify(error));
    throw error;
  }
};
