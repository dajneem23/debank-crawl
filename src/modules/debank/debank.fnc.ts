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

export const queryDebankImportantTokens = async (
  { select = 'symbol,eth_contract,bsc_contract,db_id,cg_id' } = {
    select: 'symbol,eth_contract,bsc_contract,db_id,cg_id',
  },
) => {
  const pgClient = Container.get(pgClientToken);
  const { rows } = await pgClient.query(`
    SELECT ${select}  FROM "debank-important-tokens"
  `);
  return { rows };
};
