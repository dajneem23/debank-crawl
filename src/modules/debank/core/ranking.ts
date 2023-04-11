import { bulkInsertOnConflict } from '@/utils/pg';
import { logger, pgp } from '../debank.config';
import { DebankJobNames } from '../debank.job';
import { JobsOptions } from 'bullmq';
import { queueRanking } from '../debank.queue';
import { sendTelegramMessage } from '@/service/alert/telegram';
import { WEBSHARE_PROXY_HTTP, WEBSHARE_PROXY_RANKING_WHALE_TOPHOLDERS_HTTP } from '@/common/proxy';
import { DebankAPI } from '@/common/api';
import { getDebankSocialRankingCrawlId } from '../service/pg';

export const fetchSocialRankingsPage = async ({
  page_num = 1,
  page_count = 50,
  crawl_id,
}: {
  page_num: number;
  page_count?: number;
  crawl_id: number;
}) => {
  try {
    const {
      data: { data, error_code },
      status,
    } = await DebankAPI.fetch({
      endpoint: DebankAPI.Social.socialRanking.endpoint,
      params: {
        page_num,
        page_count,
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
      throw new Error('fetchSocialRankingsPage: Error fetching social ranking');
    }
    const { social_ranking_list } = data;
    const crawl_time = new Date();
    const rows = social_ranking_list.map(
      ({ id: user_address, rank, base_score, total_score, score_dict, value_dict }: any) => ({
        user_address,
        rank,
        base_score,
        total_score,
        score_dict,
        value_dict,
        crawl_id,
        crawl_time,
      }),
    );
    const cs = new pgp.helpers.ColumnSet(
      ['rank', 'base_score', 'score_dict', 'value_dict', 'total_score', 'crawl_time', 'crawl_id'],
      {
        table: 'debank-social-ranking',
      },
    );
    const onConflict = `UPDATE SET  ${cs.assignColumns({ from: 'EXCLUDED', skip: ['user_address'] })}`;
    await bulkInsertOnConflict({
      table: 'debank-social-ranking',
      data: rows,
      conflict: 'user_address',
      onConflict,
    });
  } catch (error) {
    logger.alert('error', '[fetchSocialRankingsPage:error]', JSON.stringify(error));
    throw error;
  }
};
export const addFetchSocialRankingJob = async () => {
  try {
    const crawl_id = await getDebankSocialRankingCrawlId();
    const jobs: {
      name: DebankJobNames;
      data: any;
      opts: JobsOptions;
    }[] = [];
    for (let page_num = 1; page_num <= 1000; page_num++) {
      jobs.push({
        name: DebankJobNames['debank:fetch:social:rankings:page'],
        data: {
          page_num,
          crawl_id,
        },
        opts: {
          jobId: `debank:fetch:social:rankings:page:${page_num}:${crawl_id}`,
          removeOnComplete: {
            age: 60 * 60 * 3,
          },
          removeOnFail: {
            age: 60 * 60 * 3,
          },
          priority: 5,

          delay: 1000 * 30,
        },
      });
    }
    await queueRanking.addBulk(jobs);
    const countJobs = await queueRanking.getJobCounts();
    await sendTelegramMessage({
      message: `[debank-Ranking]\n
      [add-fetch-social-ranking-job]
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
    logger.alert('error', '[addFetchSocialRankingJob:error]', JSON.stringify(error));
    throw error;
  }
};
