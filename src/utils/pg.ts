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

export const createPartitionByRange = async ({
  table,
  start,
  end,
  partition_by,
  partition_name,
}: {
  table: string;
  start: string;
  end: string;
  partition_by?: string;
  partition_name?: string;
}) => {
  const pgClient = Container.get(pgPromiseClientToken);
  const query = `CREATE TABLE IF NOT EXISTS "${
    partition_name ? partition_name : `${table}_${start}_${end}`
  }" PARTITION OF "${table}" FOR VALUES FROM ('${start}') TO ('${end}') ${
    partition_by ? `PARTITION BY ${partition_by}` : ''
  }`;
  return await pgClient.none(query);
};

export const createPartitionByList = async ({
  table,
  values,

  partition_name,
}: {
  table: string;
  values: string[] | number[];
  partition_name: string;
}) => {
  const pgClient = Container.get(pgPromiseClientToken);
  const query = `CREATE TABLE IF NOT EXISTS "${
    partition_name ? partition_name : `${table}_${values.join('_')}`
  }" PARTITION OF "${table}" FOR VALUES IN (${values.map((value) => `'${value}'`).join(',')})`;
  return await pgClient.none(query);
};

export const createPartitionDefault = async ({ table }: { table: string }) => {
  const pgClient = Container.get(pgPromiseClientToken);
  const query = `CREATE TABLE IF NOT EXISTS "${table}_default" PARTITION OF "${table}" DEFAULT`;
  return await pgClient.none(query);
};
