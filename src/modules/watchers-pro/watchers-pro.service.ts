import Bluebird from 'bluebird';
import { queryWatchersProVCFund } from './watchers-pro.func';
import axios from 'axios';
import Container from 'typedi';
import { pgpToken } from '@/loaders/pg.loader';
import { bulkInsertOnConflict } from '@/utils/pg';
import { WEBSHARE_PROXY_HTTP } from '@/common/proxy';

export class WatchersProService {
  constructor() {
    this.run();
  }
  //TODO: CRON JOB
  async run() {
    const { rows: funds } = await queryWatchersProVCFund({});
    await Bluebird.map(
      funds,
      async ({ subgroup }) => {
        if (subgroup === 'Alameda Research') return;
        const { data } = await axios.get(
          `https://www.watchers.pro/api/dashboard/vcWatch/portfolio/entityAddresses?subgroup=${subgroup}&limit=1000&page=1`,
          {
            proxy: {
              host: WEBSHARE_PROXY_HTTP.host,
              port: WEBSHARE_PROXY_HTTP.port,
              auth: {
                username: WEBSHARE_PROXY_HTTP.auth.username,
                password: WEBSHARE_PROXY_HTTP.auth.password,
              },
              protocol: WEBSHARE_PROXY_HTTP.protocol,
            },
          },
        );
        const {
          data: { total, rows },
        } = data;
        const insertData = rows.map(({ type, ethereumAddress: ethereum_address, subgroup, tag, certainty }) => ({
          type,
          ethereum_address,
          subgroup,
          tag,
          certainty,
        }));
        await bulkInsertOnConflict({
          table: 'watchers_pro-vc-entity',
          data: insertData,
          conflict: 'ethereum_address',
          onConflict: 'NOTHING',
        });
        console.info(`Inserted ${insertData.length} rows for ${subgroup}!`);
      },
      {
        concurrency: 20,
      },
    );
  }
}
