import { pgClientToken } from '@/loaders/pg.loader';
import Container from 'typedi';

export const queryDebankCoins = async (
  { select = 'symbol, details' } = {
    select: 'symbol, details',
  },
) => {
  const pgClient = Container.get(pgClientToken);
  const { rows } = await pgClient.query(`
    SELECT ${select}, details FROM "debank-coins"
  `);
  return { rows };
};
