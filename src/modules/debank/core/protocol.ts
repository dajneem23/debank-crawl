import { DebankAPI } from '../../../common/api';
import { WEBSHARE_PROXY_HTTP, WEBSHARE_PROXY_RANKING_WHALE_TOPHOLDERS_HTTP } from '../../../common/proxy';
import { logger } from '../debank.config';
import { insertDebankPools, queryDebankProtocols } from '../debank.fnc';
import { DebankJobNames } from '../debank.job';
import { queueCommon } from '../debank.queue';

export const addFetchProtocolPoolsById = async ({ id: protocol_id }) => {
  try {
    const {
      data: { data, error_code },
      status,
    } = await DebankAPI.fetch({
      endpoint: DebankAPI.Protocols.pool.endpoint,
      params: {
        id: protocol_id,
        start: 0,
        limit: 20,
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
      throw new Error('fetchProtocolPoolsPage:error');
    }
    const { total_count } = data;
    const jobs = Array.from({ length: Math.ceil(total_count / DebankAPI.Protocols.pool.params.limit) }, (_, index) => ({
      name: DebankJobNames['debank:fetch:protocols:pools:page'],
      data: {
        protocol_id,
        start: index * DebankAPI.Protocols.pool.params.limit,
        limit: DebankAPI.Protocols.pool.params.limit,
      },
      opts: {
        jobId: `debank:fetch:protocols:pools:page:${protocol_id}:${index}`,
        removeOnComplete: {
          age: 60 * 60 * 3,
        },
        removeOnFail: {
          age: 60 * 60 * 3,
        },
        priority: 5,

        delay: 1000 * 30,
      },
    }));
    jobs.length && (await queueCommon.addBulk(jobs));
  } catch (error) {
    logger.error('error', '[addFetchProtocolPools:error]', JSON.stringify(error));
    throw error;
  }
};

export const fetchProtocolPoolsPage = async ({
  protocol_id,
  start = DebankAPI.Protocols.pool.params.start,
  limit = DebankAPI.Protocols.pool.params.limit,
}: {
  protocol_id: string;
  start?: number;
  limit?: number;
}) => {
  try {
    const {
      data: { data, error_code },
      status,
    } = await DebankAPI.fetch({
      endpoint: DebankAPI.Protocols.pool.endpoint,
      params: {
        id: protocol_id,
        start,
        limit,
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
      throw new Error('fetchProtocolPoolsPage:error');
    }
    const { pools } = data;
    pools.length &&
      (await insertDebankPools({
        pools,
      }));
    return {
      pools,
    };
  } catch (error) {
    logger.error('error', '[fetchProtocolPoolsPage:error]', JSON.stringify(error));
    throw error;
  }
};

export const addFetchProtocolPoolsJob = async () => {
  try {
    const { rows } = await queryDebankProtocols();
    const jobs = rows.map(({ db_id: id }) => ({
      name: DebankJobNames['debank:add:fetch:protocols:pools:id'],
      data: {
        id,
      },
      opts: {
        jobId: `debank:add:fetch:protocols:pools:id:${id}`,
        removeOnComplete: {
          age: 60 * 60 * 3,
        },
        removeOnFail: {
          age: 60 * 60 * 3,
        },
        priority: 5,
        delay: 1000 * 30,
      },
    }));
    jobs.length && (await queueCommon.addBulk(jobs));

    // await discord.sendMsg({
    //   message:
    //     `\`\`\`diff` +
    //     `\n[DEBANK-addFetchProtocolPoolsJob]` +
    //     `\n+ totalJobs::${jobs.length}` +
    //     `\nstart on::${new Date().toISOString()}` +
    //     `\`\`\`
    //   `,
    //   channelId: '1041620555188682793',
    // });
  } catch (error) {
    logger.error('error', '[addFetchProtocolPools:error]', JSON.stringify(error));
    throw error;
  }
};
