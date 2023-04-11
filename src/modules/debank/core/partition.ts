import { formatDate } from '@/utils/date';
import { createPartitionsInDateRange, truncateAndDropTable } from '@/utils/pg';
import { logger } from '../debank.config';
import { MAX_CRAWL_ID } from '../debank.const';

export const createPartitions = async () => {
  const tables = ['debank-portfolio-balances', 'debank-portfolio-projects'];
  await Promise.all(
    tables.map((table) =>
      createPartitionsInDateRange({
        table,
        max_list_partition: MAX_CRAWL_ID,
      }),
    ),
  );
};
export const truncatePartitions = async ({
  table,
  days = 14,
  keepDays = 7,
}: {
  table: string;
  days?: number;
  keepDays?: number;
}) => {
  try {
    const keepDate = Array.from({ length: keepDays }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return formatDate(date, 'YYYYMMDD');
    });
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = formatDate(date, 'YYYYMMDD');
      //keep some days
      if (keepDate.includes(dateStr)) {
        continue;
      }
      //truncate by date
      //example: debank-portfolio-balances-20210701
      await truncateAndDropTable({
        table: `${table}-${dateStr}`,
      });
    }
  } catch (error) {
    logger.error('error', '[truncatePartitions:error]', JSON.stringify(error));
    throw error;
  }
};
export const cleanOutdatedData = async () => {
  //truncate table not today
  const tables = ['debank-portfolio-balances', 'debank-portfolio-projects'];
  await Promise.all(tables.map((table) => truncatePartitions({ table })));
};
