import { pgPromiseClientToken, pgpToken } from '@/loaders/pg.loader';
import Container from 'typedi';
import { formatDate } from './date';
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
export const createPartitionsInDateRange = async ({
  table,
  days = 7,
  max_list_partition = 8,
}: {
  table: string;
  days?: number;
  max_list_partition?: number;
}) => {
  const next7Days = Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return formatDate(date, 'YYYYMMDD');
  });
  for (const date of next7Days) {
    await createPartitionByRange({
      table,
      start: date + '00',
      end: date + '99',
      partition_name: `${table}-${date}`,
      partition_by: 'LIST(crawl_id)',
    });
    await createPartitionDefault({
      table: `${table}-${date}`,
    });
    for (let i = 1; i <= max_list_partition; i++) {
      await createPartitionByList({
        table: `${table}-${date}`,
        partition_name: `${table}-${date}${i >= 10 ? `${i}` : `0${i}`}`,
        values: [`${date}${i >= 10 ? i : `0${i}`}`],
      });
    }
  }
};

export const truncateTable = async ({ table }: { table: string }) => {
  const pgClient = Container.get(pgPromiseClientToken);
  const query = `TRUNCATE TABLE "${table} IF EXISTS"`;
  return await pgClient.none(query);
};

export const truncateAndDropTable = async ({ table }: { table: string }) => {
  await truncateTable({ table });
  await dropTable({ table });
};

export const dropTable = async ({ table }: { table: string }) => {
  const pgClient = Container.get(pgPromiseClientToken);
  const query = `DROP TABLE "${table} IF EXISTS"`;
  return await pgClient.none(query);
};
/* Here is the explanation for the code above:
1. First we need to get the current date in YYYYMMDD format, and save it in a variable called now.
2. Then we create a for loop to loop through the date range.
3. In the loop, we create a new Date object, and subtract i days from the current date.
4. We format the date object to YYYYMMDD format, and save it in a variable called dateStr.
5. We check if the dateStr is equal to the now variable. If yes, we continue to the next iteration.
6. If not, we call the truncateTable function to truncate the table.
*/
export const truncateTableInDateRange = async ({ table, days = 7 }: { table: string; days?: number }) => {
  const now = formatDate(new Date(), 'YYYYMMDD');
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = formatDate(date, 'YYYYMMDD');
    if (dateStr === now) {
      continue;
    }
    await truncateTable({ table: `${table}-${dateStr}` });
  }
};
