import { pgPromiseClientToken, pgpToken } from '@/loaders/pg.loader';
import Container from 'typedi';
//bulk insert with pg-promise
export const bulkInsert = async ({ table, data }: { table: string; data: any[] }) => {
  const pgp = Container.get(pgpToken);
  const pgClient = Container.get(pgPromiseClientToken);
  const cs = new pgp.helpers.ColumnSet(
    Object.keys(data[0]).map((key) => {
      return { name: key };
    }),
    { table },
  );
  const query = pgp.helpers.insert(data, cs);
  return await pgClient.none(query);
};

export const bulkInsertOnConflict = async ({
  table,
  data,
  conflict,
  onConflict = 'NOTHING',
}: {
  table: string;
  data: any[];
  conflict: string;
  onConflict: string;
}) => {
  const pgp = Container.get(pgpToken);
  const pgClient = Container.get(pgPromiseClientToken);
  const cs = new pgp.helpers.ColumnSet(
    Object.keys(data[0]).map((key) => {
      return { name: key };
    }),
    { table },
  );
  const query = pgp.helpers.insert(data, cs) + ` ON CONFLICT (${conflict}) DO ${onConflict}`;
  return await pgClient.none(query);
};

export const escapeQuery = (str: string) => {
  return str.replace(/\\u0000/g, '');
};
