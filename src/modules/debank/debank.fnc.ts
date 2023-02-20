import { pgClientToken } from '@/loaders/pg.loader';
import Container from 'typedi';

export const queryDebankCoins = async () => {
  const pgClient = Container.get(pgClientToken);
  const { rows } = await pgClient.query(`
    SELECT symbol, details FROM "debank-coins"
  `);
  return { rows };
};
