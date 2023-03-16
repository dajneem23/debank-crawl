import { pgClientToken } from '@/loaders/pg.loader';
import Container from 'typedi';

export const queryWatchersProVCFund = async ({}) => {
  const pgClient = Container.get(pgClientToken);
  const query = `SELECT * FROM "watchers_pro-vc-fund"`;
  const { rows } = await pgClient.query(query);
  return { rows };
};
// export const bulkInsertWatchersProVCEntities = async ({ data }: { data: any[] }) => {
//   const pgClient = Container.get(pgClientToken);
// };
