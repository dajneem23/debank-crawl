import { pgClientToken, pgpToken } from '../../loaders/pg.loader';
import Container from 'typedi';
import { bulkInsert, bulkInsertOnConflict } from '../../utils/pg';
import { DebankAPI } from '../../common/api';
import { formatDate } from '../../utils/date';
import { DIMongoClient } from '../../loaders/mongoDB.loader';
import { HTTPRequest, HTTPResponse, Page } from 'puppeteer';
import { sleep } from '../../utils/common';
import { filter, isNil, uniq, uniqBy } from 'lodash';
import { getRedisKey, setExpireRedisKey } from '../../service/redis';
import { mgClient } from './debank.config';
import { ObjectId } from 'mongodb';
import { ACCOUNT_TAGS, NULL_ACCOUNT } from '@/types/account';

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

export const queryDebankPools = async (
  {
    select = '*',
    where,
  }: {
    select?: string;
    where?: string;
  } = {
    select: '*',
  },
) => {
  const pgClient = Container.get(pgClientToken);
  const { rows } = await pgClient.query(`
  SELECT ${select} FROM "debank-pools"
  ${where ? `WHERE ${where}` : ''}
`);
  return { rows };
};

export const insertDebankPoolsToMongo = async () => {
  const { rows } = await queryDebankPools();
  const mgClient = Container.get(DIMongoClient);
  await mgClient.db('onchain').collection('debank-pools').insertMany(rows);
};

export const queryDebankProtocols = async () => {
  const pgClient = Container.get(pgClientToken);
  const { rows } = await pgClient.query(
    `
      SELECT
        db_id
      FROM
        "debank-protocols"
    `,
  );
  return {
    rows,
  };
};

export const queryDebankTopHoldersImportantToken = async () => {
  const pgClient = Container.get(pgClientToken);

  const { rows } = await pgClient.query(
    `
      SELECT
        "debank-user-address-list".user_address as user_address
      FROM
        "debank-user-address-list"
      LEFT JOIN
        "debank-top-holders_link_debank-coins"
          ON "debank-user-address-list".user_address = "debank-top-holders_link_debank-coins".user_address
      LEFT JOIN
        "debank-user-address-list_link_debank-important-tokens"
          ON "debank-user-address-list_link_debank-important-tokens".user_address = "debank-user-address-list".user_address
      INNER JOIN
        "debank-important-tokens"
          ON  "debank-top-holders_link_debank-coins".coin_id ="debank-important-tokens".db_id
            OR
              "debank-user-address-list_link_debank-important-tokens".eth_contract = "debank-important-tokens".eth_contract
      GROUP BY
        "debank-user-address-list".user_address
  `,
  );
  return {
    rows,
  };
};
export const insertDebankSocialRanking = async ({
  user_address,
  rank,
  base_score,
  score_dict,
  value_dict,
  total_score,
}: {
  user_address: string;
  rank: number;
  base_score: number;
  score_dict: any;
  value_dict: any;
  total_score: number;
}) => {
  const pgClient = Container.get(pgClientToken);

  await pgClient.query(
    `
      INSERT INTO "debank-social-ranking" (
        user_address,
        rank,
        base_score,
        score_dict,
        value_dict,
        total_score,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_address) DO UPDATE SET
        rank = $2,
        base_score = $3,
        score_dict = $4,
        value_dict = $5,
        total_score = $6,
        updated_at = $7
    `,
    [user_address, rank, base_score, score_dict, value_dict, total_score, new Date()],
  );

  // .catch((err) => this.logger.discord('error', '[debank:insertSocialRanking]', JSON.stringify(err)));
};
export const queryDebankSocialRanking = async (
  {
    select = '*',
    limit = 10000,
    orderBy = 'rank',
    order = 'ASC',
  }: {
    select: string;
    limit: number;
    orderBy: string;
    order: 'DESC' | 'ASC';
  } = {
    select: '*',
    limit: 10000,
    orderBy: 'rank',
    order: 'ASC',
  },
) => {
  const pgClient = Container.get(pgClientToken);
  const { rows } = await pgClient.query(
    `SELECT ${select} FROM "debank-social-ranking" ORDER BY ${orderBy} ${order} LIMIT ${limit}`,
  );
  return { rows };
};
export const queryDebankAddressList = async ({
  select = '*',
  limit,
  orderBy = 'updated_at',
  order = 'DESC',
  where,
}: {
  select?: string;
  limit?: number;
  orderBy?: string;
  where?: string;
  order?: 'DESC' | 'ASC';
}) => {
  const pgClient = Container.get(pgClientToken);
  const { rows } = await pgClient.query(
    `  ${select} FROM "debank-user-address-list"
    ${where ? 'WHERE ' + where : ''}
    ORDER BY ${orderBy} ${order}  ${limit ? 'LIMIT ' + limit : ''}`,
  );
  return {
    rows,
  };
};

export const insertDebankWhaleList = async ({ whales, crawl_id }: { whales: any[]; crawl_id: number }) => {
  //insert all whale list
  const data = whales.map((whale) => ({
    user_address: whale.id,
    details: JSON.stringify(whale).replace(/\\u0000/g, ''),
    crawl_id,
    crawl_time: new Date(),
  }));
  data.length &&
    (await bulkInsert({
      data,
      //TODO: change this to prod table
      table: 'debank-whales',
    }));
};

export const insertDebankProjectList = async () => {
  const { data, status } = await DebankAPI.fetch({
    endpoint: DebankAPI.Project.list.endpoint,
  });
  const pgClient = Container.get(pgClientToken);

  if (status !== 200) {
    throw new Error('queryProjectList: Error fetching project list');
  }
  const { data: projects = [] } = data;
  for (const {
    id,
    name,
    chain,
    platform_token_chain,
    platform_token_id,
    site_url,
    tvl,
    active_user_count_24h,
    contract_call_count_24h,
    portfolio_user_count,
    total_contract_count,
    total_user_count,
    total_user_usd,
    is_stable,
    is_support_portfolio,
    is_tvl,
    priority,
  } of projects) {
    await pgClient.query(
      `INSERT INTO "debank-projects" (
          id,
          name,
          chain,
          platform_token_chain,
          platform_token_id,
          site_url,
          tvl,
          active_user_count_24h,
          contract_call_count_24h,
          portfolio_user_count,
          total_contract_count,
          total_user_count,
          total_user_usd,
          is_stable,
          is_support_portfolio,
          is_tvl,
          priority,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [
        id,
        name,
        chain,
        platform_token_chain,
        platform_token_id,
        site_url,
        tvl,
        active_user_count_24h,
        contract_call_count_24h,
        portfolio_user_count,
        total_contract_count,
        total_user_count,
        total_user_usd,
        is_stable,
        is_support_portfolio,
        is_tvl,
        priority,
        new Date(),
      ],
    );
    // .catch((err) => this.logger.discord('error', '[queryProjectList:insert]', JSON.stringify(err)));
  }
};

export const updateDebankUserProfile = async ({ address, profile }: { address: string; profile: any }) => {
  const pgClient = Container.get(pgClientToken);

  return pgClient.query(
    `
      UPDATE "debank-user-address-list" SET debank-user-address-list = $1 WHERE address = $2
    `,
    [JSON.stringify(profile), address],
  );
};

export const insertDebankCoins = async ({ coins, crawl_id }: { coins: any[]; crawl_id: string }) => {
  const data = coins.map((coin) => ({
    details: JSON.stringify(coin),
    crawl_id,
    crawl_time: new Date(),
    cg_id: coin.id,
  }));

  if (data.length) {
    const pgp = Container.get(pgpToken);
    const cs = new pgp.helpers.ColumnSet(['details', 'crawl_time', 'crawl_id'], {
      table: 'debank-coins',
    });
    const mgOperations = coins.map(({ id, ...rest }) => ({
      updateOne: {
        filter: { id },
        update: {
          $set: {
            ...rest,
          },
        },
        upsert: true,
      },
    }));
    await mgClient.db('onchain').collection('debank-coin').bulkWrite(mgOperations);

    const onConflict = `UPDATE SET  ${cs.assignColumns({ from: 'EXCLUDED', skip: ['db_id'] })}`;
    await bulkInsertOnConflict({
      table: 'debank-coins',
      data,
      conflict: 'db_id',
      onConflict,
    });
  }
};

export const insertDebankCoin = async ({
  coin,
  crawl_id,
  crawl_time,
}: {
  coin: any;
  crawl_id: number;
  crawl_time: Date;
}) => {
  const pgClient = Container.get(pgClientToken);
  await pgClient.query(
    `
      INSERT INTO "debank-coins"(
        symbol,
        crawl_id,
        details,
        crawl_time
      )
      VALUES ($1, $2, $3, $4) ON CONFLICT (symbol) DO UPDATE
        SET details = $3, crawl_time = $4, crawl_id = $2
    `,
    [coin.symbol, crawl_id, JSON.stringify(coin), crawl_time ?? new Date()],
  );
};
export const queryDebankAllCoins = async () => {
  const pgClient = Container.get(pgClientToken);

  const { rows } = await pgClient.query(`
      SELECT symbol, details, db_id FROM "debank-coins"
    `);
  return rows;
};
export const insertDebankTopHolders = async ({
  holders,
  crawl_id,
  id,
}: {
  holders: any[];
  crawl_id: number;
  id: string;
}) => {
  const crawl_time = new Date();
  //TODO: filter out holders that already exist
  //!: remove this and replace by trigger
  // const { rows } = await this.queryTopHoldersByCrawlId({
  //   symbol,
  //   crawl_id,
  // });

  if (!holders.length) return;
  const PGvalues = holders.map((holder) => ({
    symbol: id,
    details: JSON.stringify(holder).replace(/\\u0000/g, ''),
    user_address: holder.id,
    crawl_id: +crawl_id,
    crawl_time,
  }));
  const mgClient = Container.get(DIMongoClient);
  const MGValues = holders.map(({ id }) => {
    return id;
  });

  await mgClient.db('onchain').collection('debank-top-holders').insertOne({
    id,
    updated_at: new Date(),
    holders: MGValues,
    crawl_id: +crawl_id,
  });
  await bulkInsert({
    data: PGvalues,
    table: 'debank-top-holders',
  });
};
export const insertDebankTopHolder = async ({
  symbol,
  user_address,
  holder,
  crawl_id,
  crawl_time,
}: {
  user_address: string;
  holder: any;
  crawl_id: number;
  crawl_time: Date;
  symbol: string;
}) => {
  const pgClient = Container.get(pgClientToken);
  await pgClient.query(
    `
      INSERT INTO "debank-top-holders"(
        user_address,
        crawl_id,
        details,
        symbol,
        crawl_time)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [user_address, crawl_id, JSON.stringify(holder), symbol, crawl_time ?? new Date()],
  );
};
export const insertDebankPools = async ({ pools }: { pools: any[] }) => {
  const updated_at = new Date();
  const values = pools.map((pool) => ({
    details: JSON.stringify(pool).replace(/\\u0000/g, ''),
    adapter_id: pool.adapter_id,
    chain: pool.chain,
    project_id: pool.project_id,
    pool_id: pool.stats?.pool_id,
    protocol_id: pool.stats?.protocol_id,
    updated_at,
  }));

  values.length &&
    (await bulkInsertOnConflict({
      data: values,
      table: 'debank-pools',
      onConflict: 'UPDATE SET details = EXCLUDED.details, updated_at = EXCLUDED.updated_at',
      conflict: 'pool_id',
    }));
};

export const queryDebankTopHoldersByCrawlId = async ({ symbol, crawl_id }: { symbol: string; crawl_id: number }) => {
  const pgClient = Container.get(pgClientToken);
  const { rows } = await pgClient.query(
    `
      SELECT * FROM "debank-top-holders" WHERE symbol = $1 AND crawl_id = $2
    `,
    [symbol, crawl_id],
  );
  return { rows };
};
export const insertDebankUserAddress = async ({
  user_address,
  updated_at,
  debank_whales_time,
  debank_top_holders_time,
  debank_ranking_time,
}: {
  user_address: string;
  updated_at?: Date;
  debank_whales_time: Date;
  debank_top_holders_time: Date;
  debank_ranking_time: Date;
}) => {
  const pgClient = Container.get(pgClientToken);

  const now = new Date();
  // update if exists else insert
  await pgClient.query(
    `
    INSERT INTO "debank-user-address-list"(
      user_address,
      debank_whales_time,
      debank_top_holders_time,
      debank_ranking_time
    )
    VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_address) DO UPDATE SET
      debank_whales_time = COALESCE(NULLIF($2,''), "debank-user-address-list".debank_whales_time),
      debank_top_holders_time = COALESCE(NULLIF($3,''), "debank-user-address-list".debank_top_holders_time),
      debank_ranking_time = COALESCE(NULLIF($4,''), "debank-user-address-list".debank_ranking_time)
  `,
    [user_address, debank_whales_time, debank_top_holders_time, debank_ranking_time, now],
  );
};
export const insertDebankUserAssetPortfolio = async ({
  user_address,
  token_list = [],
  coin_list = [],
  balance_list = [],
  project_list = [],
  used_chains = [],
  crawl_id,
  crawl_time,
}: {
  user_address: string;
  token_list?: any;
  coin_list?: any;
  balance_list?: any;
  project_list?: any;
  crawl_id: number;
  used_chains?: any;
  crawl_time: Date;
}) => {
  // const tokens_rows = token_list.map((token: any) => ({
  //   user_address,
  //   details: JSON.stringify(token).replace(/\\u0000/g, ''),
  //   crawl_id,
  //   crawl_time: now,
  // }));

  // const coins_rows = coin_list.map((coin: any) => ({
  //   user_address,
  //   details: JSON.stringify(coin).replace(/\\u0000/g, ''),
  //   crawl_id,
  //   crawl_time: now,
  // }));

  // const balances_rows = balance_list.map((balance: any) => ({
  //   user_address,
  //   details: JSON.stringify({
  //     ...balance,
  //     is_stable_coin: STABLE_COINS.some((b: any) => b.symbol === balance.symbol),
  //   }).replace(/\\u0000/g, ''),
  //   is_stable_coin: STABLE_COINS.some((b: any) => b.symbol === balance.symbol),
  //   price: balance.price,
  //   symbol: balance.symbol,
  //   optimized_symbol: balance.optimized_symbol,
  //   amount: balance.amount,
  //   crawl_id,
  //   crawl_time: now,
  //   chain: balance.chain,
  //   usd_value: +balance.price * +balance.amount,
  // }));

  // const projects_rows = project_list.map((project: any) => ({
  //   user_address,
  //   details: JSON.stringify(project).replace(/\\u0000/g, ''),
  //   crawl_id,
  //   crawl_time: now,

  //   usd_value:
  //     project.portfolio_item_list?.reduce((acc: number, { stats }: any) => {
  //       return acc + stats.asset_usd_value;
  //     }, 0) || 0,
  // }));

  // tokens_rows.length &&
  //   (await bulkInsert({
  //     data: tokens_rows,
  //     table: 'debank-portfolio-tokens',
  //   }));

  // coins_rows.length &&
  //   (await bulkInsert({
  //     data: coins_rows,
  //     table: 'debank-portfolio-coins',
  //   }));

  // balances_rows.length &&
  //   (await bulkInsert({
  //     data: balances_rows,
  //     table: 'debank-portfolio-balances',
  //   }));

  // projects_rows.length &&
  //   (await bulkInsert({
  //     data: projects_rows,
  //     table: 'debank-portfolio-projects',
  //   }));
  const mgClient = Container.get(DIMongoClient);
  const { tags, labels } = (await mgClient.db('onchain').collection('address-book').findOne({
    address: user_address,
  })) || {
    tags: [],
    labels: [],
  };
  const collection = mgClient.db('onchain').collection('account-snapshot');
  const portfolio_item_list = project_list
    .map(({ portfolio_item_list = [] }) => {
      return portfolio_item_list.map(({ stats, ...rest }) => ({
        ...rest,
        stats,
        usd_value: stats.asset_usd_value,
        net_value: stats.net_usd_value,
        debt_value: stats.debt_usd_value,
      }));
    })
    .flat();
  const total_balance_usd_value = balance_list.reduce(
    (acc: number, { amount, price }: any) => acc + +amount * +price,
    0,
  );
  const total_project_usd_value = portfolio_item_list.reduce((acc: number, { usd_value }: any) => acc + +usd_value, 0);
  const total_project_net_value = portfolio_item_list.reduce((acc: number, { net_value }: any) => acc + +net_value, 0);
  const total_project_debt_value = portfolio_item_list.reduce(
    (acc: number, { debt_value }: any) => acc + +debt_value,
    0,
  );

  const mgData = {
    address: user_address,
    crawl_id: +crawl_id,
    crawl_time,
    timestamp: +(new Date(crawl_time).getTime() / 1000).toFixed(0),
    tags,
    labels,
    ...(coin_list.length && {
      coin_list,
    }),
    ...(token_list.length && {
      token_list,
    }),
    balance_list,
    project_list,
    used_chains,
    stats: {
      total_balance_usd_value,
      total_project_usd_value,
      total_project_net_value,
      total_project_debt_value,
      total_usd_value: total_balance_usd_value + total_project_usd_value,
      total_net_usd_value: total_balance_usd_value + total_project_net_value,
    },
  };
  await collection.findOneAndUpdate(
    {
      address: user_address,
      crawl_id: +crawl_id,
    },
    {
      $set: mgData,
    },
    {
      upsert: true,
    },
  );
};
export const insertDebankWhale = async ({
  whale,
  crawl_id,
  updated_at,
}: {
  whale: any;
  crawl_id: number;
  updated_at?: Date;
}) => {
  const pgClient = Container.get(pgClientToken);

  await pgClient.query(
    `
        INSERT INTO "debank-whales" (
          user_address,
          details,
          crawl_id,
          updated_at
        )
        VALUES ($1, $2, $3, $4)
        `,
    [whale.id, JSON.stringify(whale), crawl_id, updated_at || new Date()],
  );
};
export const insertDebankProjectUser = async ({
  projectId,
  share,
  usd_value,
  user_address,
}: {
  projectId: string;
  share: any;
  usd_value: any;
  user_address: any;
}) => {
  const pgClient = Container.get(pgClientToken);
  await pgClient.query(
    `INSERT INTO "debank-project-users" (
          project_id,
          share,
          usd_value,
          user_address,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5)`,
    [projectId, share, usd_value, user_address, new Date()],
  );
};
export const insertDebankUserBalance = async ({
  user_address,
  symbol,
  optimized_symbol,
  token_name,
  token_id,
  amount,
  price,
  protocol_id,
  chain,
  updated_at = new Date(),
  is_stable_coin = false,
}: {
  user_address: string;
  symbol: string;
  optimized_symbol: string;
  token_name: string;
  token_id: string;
  amount: string;
  price: string;
  protocol_id: string;
  chain: string;
  updated_at: Date;
  is_stable_coin: boolean;
}) => {
  const pgClient = Container.get(pgClientToken);

  await pgClient.query(
    `INSERT INTO "debank-user-balance" (
          user_address,
          symbol,
          optimized_symbol,
          token_name,
          token_id,
          amount,
          price,
          protocol_id,
          chain,
          is_stable_coin,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      user_address,
      symbol,
      optimized_symbol,
      token_name,
      token_id,
      amount,
      price,
      protocol_id,
      chain,
      is_stable_coin,
      updated_at,
    ],
  );
};

export const queryDebankUserAddressByProjectId = async ({ projectId }: { projectId: string }) => {
  if (!projectId) {
    throw new Error('queryUserAddressByProjectId: projectId is required');
  }
  const pgClient = Container.get(pgClientToken);

  const { rows } = await pgClient.query(
    `SELECT user_address FROM "debank-project-users" WHERE project_id = $1 GROUP BY user_address`,
    [projectId],
  );
  return { rows };
};

export const getDebankWhalesCrawlId = async () => {
  const pgClient = Container.get(pgClientToken);

  const { rows } = await pgClient.query(`
    SELECT
      max(crawl_id) as crawl_id
    FROM
      "debank-whales"
  `);
  if (rows[0]?.crawl_id && rows[0].crawl_id) {
    const crawl_id = rows[0].crawl_id;
    const crawl_id_date = crawl_id.slice(0, 8);
    const crawl_id_number = parseInt(crawl_id.slice(8));
    if (crawl_id_date === formatDate(new Date(), 'YYYYMMDD')) {
      return +`${crawl_id_date}${crawl_id_number + 1 >= 10 ? crawl_id_number + 1 : '0' + (crawl_id_number + 1)}`;
    } else {
      return +`${formatDate(new Date(), 'YYYYMMDD')}01`;
    }
  } else {
    return +`${formatDate(new Date(), 'YYYYMMDD')}01`;
  }
};

export const getDebankCrawlId = async () => {
  const pgClient = Container.get(pgClientToken);
  const { rows } = await pgClient.query(`
    SELECT
      max(last_crawl_id) as last_crawl_id
    FROM
      "debank-user-address-list"
  `);
  if (rows[0]?.last_crawl_id && rows[0].last_crawl_id) {
    const last_crawl_id = rows[0].last_crawl_id;
    const last_crawl_id_date = last_crawl_id.slice(0, 8);
    const last_crawl_id_number = parseInt(last_crawl_id.slice(8));
    if (last_crawl_id_date === formatDate(new Date(), 'YYYYMMDD')) {
      return `${last_crawl_id_date}${
        last_crawl_id_number + 1 >= 10 ? last_crawl_id_number + 1 : '0' + (last_crawl_id_number + 1)
      }`;
    } else {
      return `${formatDate(new Date(), 'YYYYMMDD')}01`;
    }
  } else {
    return `${formatDate(new Date(), 'YYYYMMDD')}01`;
  }
};
export const getAccountSnapshotCrawlId = async () => {
  const snapshot = await mgClient
    .db('onchain')
    .collection('account-snapshot')
    .findOne(
      {},
      {
        sort: { crawl_id: -1 },
      },
    );
  if (snapshot?.crawl_id && snapshot.crawl_id) {
    const crawl_id = snapshot.crawl_id.toString();
    const crawl_id_date = crawl_id.slice(0, 8);
    const crawl_id_number = parseInt(crawl_id.slice(8));
    if (crawl_id_date === formatDate(new Date(), 'YYYYMMDD')) {
      return `${crawl_id_date}${crawl_id_number + 1 >= 10 ? crawl_id_number + 1 : '0' + (crawl_id_number + 1)}`;
    } else {
      return `${formatDate(new Date(), 'YYYYMMDD')}01`;
    }
  } else {
    return `${formatDate(new Date(), 'YYYYMMDD')}01`;
  }
};
export const getDebankCoinsCrawlId = async () => {
  const pgClient = Container.get(pgClientToken);
  const { rows } = await pgClient.query(`
  SELECT
      max(crawl_id) as crawl_id
  FROM
    "debank-coins"
  `);
  if (rows[0]?.crawl_id && rows[0].crawl_id) {
    const crawl_id = rows[0].crawl_id;
    const crawl_id_date = crawl_id.slice(0, 8);
    const crawl_id_number = parseInt(crawl_id.slice(8));
    if (crawl_id_date === formatDate(new Date(), 'YYYYMMDD')) {
      return `${crawl_id_date}${crawl_id_number + 1 >= 10 ? crawl_id_number + 1 : '0' + (crawl_id_number + 1)}`;
    } else {
      return `${formatDate(new Date(), 'YYYYMMDD')}1`;
    }
  } else {
    return `${formatDate(new Date(), 'YYYYMMDD')}1`;
  }
};

export const getDebankSocialRankingCrawlId = async () => {
  const pgClient = Container.get(pgClientToken);

  const { rows } = await pgClient.query(`
  SELECT
      max(crawl_id) as crawl_id
  FROM
    "debank-social-ranking"
  `);
  if (rows[0]?.crawl_id && rows[0].crawl_id) {
    const crawl_id = rows[0].crawl_id;
    const crawl_id_date = crawl_id.slice(0, 8);
    const crawl_id_number = parseInt(crawl_id.slice(8));
    if (crawl_id_date === formatDate(new Date(), 'YYYYMMDD')) {
      return `${crawl_id_date}${crawl_id_number + 1 >= 10 ? crawl_id_number + 1 : '0' + (crawl_id_number + 1)}`;
    } else {
      return `${formatDate(new Date(), 'YYYYMMDD')}01`;
    }
  } else {
    return `${formatDate(new Date(), 'YYYYMMDD')}01`;
  }
};

export const getDebankTopHoldersCrawlId = async () => {
  const pgClient = Container.get(pgClientToken);

  const { rows } = await pgClient.query(`
    SELECT
      max(crawl_id) as crawl_id
    FROM
      "debank-top-holders"
  `);
  if (rows[0]?.crawl_id && rows[0].crawl_id) {
    const crawl_id = rows[0].crawl_id;
    const crawl_id_date = crawl_id.slice(0, 8);
    const crawl_id_number = parseInt(crawl_id.slice(8));
    if (crawl_id_date === formatDate(new Date(), 'YYYYMMDD')) {
      return `${crawl_id_date}${crawl_id_number + 1 >= 10 ? crawl_id_number + 1 : '0' + (crawl_id_number + 1)}`;
    } else {
      return `${formatDate(new Date(), 'YYYYMMDD')}01`;
    }
  } else {
    return `${formatDate(new Date(), 'YYYYMMDD')}01`;
  }
};

export const pageDebankFetchProfileAPI = async ({
  page,
  url,
  retry = 5,
  timeout = 30 * 1000,
  user_address,
}: {
  page: Page;
  url: string;
  retry?: number;
  timeout?: number;
  user_address: string;
}): Promise<HTTPResponse> => {
  try {
    // console.log('pageDebankFetchProfileAPI', { url, user_address, retry });
    const { api_nonce, api_sign, api_ts, api_ver } = await getDebankAPISign();
    const [_, data] = await Promise.all([
      page.evaluate(
        (url, { api_nonce, api_sign, api_ts, api_ver }) => {
          // @ts-ignore-start
          fetch(url, {
            referrerPolicy: 'strict-origin-when-cross-origin',
            body: null,
            headers: {
              'x-api-nonce': api_nonce,
              'x-api-sign': api_sign,
              'x-api-ts': api_ts,
              'x-api-ver': api_ver,
            },
            method: 'GET',
            mode: 'cors',
            credentials: 'include',
          }).then((res) => res.json());
          // @ts-ignore-end
        },
        url,
        {
          api_nonce,
          api_sign,
          api_ts,
          api_ver,
        },
      ),
      page.waitForResponse(
        async (response) => {
          return response.url().includes(url);
        },
        {
          timeout,
        },
      ),
    ]);
    if (data.status() != 200) {
      throw new Error(`response status is not 200: ${data.status()}: ${data.url()}`);
    }
    //check if response is valid
    await data.json();

    return data;
  } catch (error) {
    if (retry > 0) {
      await sleep(10 * 1000);
      await page.goto(`https://debank.com/profile/${user_address}`, {
        timeout: 1000 * 60,
      });
      // await page.reload();
      return await pageDebankFetchProfileAPI({ url, retry: retry - 1, page, user_address, timeout });
    } else {
      throw error;
    }
  }
};

export const bulkWriteUsersProject = async (data: any[]) => {
  const mgClient = Container.get(DIMongoClient);
  const collection = mgClient.db('onchain-dev').collection('account-project-snapshot');
  await collection.insertMany(data);
};

export const getAccountsFromTxEvent = async () => {
  const mgClient = Container.get(DIMongoClient);
  const collection = mgClient.db('onchain').collection('tx-event');
  //get address from tx-event collection and distinct it (from, to)
  const ACCOUNT_TYPES = ['eoa', 'smart_contract'];
  const accounts = await collection
    .aggregate([
      {
        $match: {
          block_at: {
            $gte: +new Date(new Date().getTime() - 1 * 60 * 60 * 1000).getTime() / 1000,
          },
          usd_value: {
            $exists: true,
            $gt: 5000,
          },
        },
      },
      {
        $set: {
          from_account: {
            $cond: {
              if: {
                $in: ['$from_account_type', ACCOUNT_TYPES],
              },
              then: '$from_account',
              else: null,
            },
          },
          to_account: {
            $cond: {
              if: {
                $in: ['$to_account_type', ACCOUNT_TYPES],
              },
              then: '$to_account',
              else: null,
            },
          },
        },
      },
      {
        $group: {
          _id: {
            from: '$from_account',
            to: '$to_account',
          },
        },
      },
      {
        $project: {
          _id: 0,
          from: '$_id.from',
          to: '$_id.to',
        },
      },
      {
        $group: {
          _id: null,
          to_accounts: {
            $push: '$to',
          },
          from_accounts: {
            $push: '$from',
          },
        },
      },
    ])
    .toArray();
  return filter(
    uniq([...accounts[0].to_accounts, ...accounts[0].from_accounts]),
    (item) => !isNil(item) && !NULL_ACCOUNT.includes(item),
  );
};

export const isValidPortfolioData = (data: any) => {
  return data && data.balance_list && data.project_list;
};

export const getValidPortfolioData = (data: any) => {
  return data.filter((item: any) => isValidPortfolioData(item));
};

export const isValidTopHoldersData = ({ data, total_count }: { data: any[]; total_count: number }) => {
  return data && uniqBy(data, 'id').length == total_count;
};
export async function updateUserProfile({ user_address, profile }: { user_address: string; profile: any }) {
  await mgClient
    .db('onchain')
    .collection('debank-user')
    .findOneAndUpdate(
      {
        address: user_address,
      },
      {
        $set: {
          ...profile,
          updated_at: new Date(),
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
      },
    );
}

export const collectApiSign = async ({ headers }: { headers: any }) => {
  let api_nonce = '';
  let api_sign = '';
  let api_ts = '';
  let api_ver = '';
  if (headers['x-api-nonce']) {
    api_nonce = headers['x-api-nonce'];
  }
  if (headers['x-api-sign']) {
    api_sign = headers['x-api-sign'];
  }
  if (headers['x-api-ts']) {
    api_ts = headers['x-api-ts'];
  }
  if (headers['x-api-ver']) {
    api_ver = headers['x-api-ver'];
  }
  if (api_nonce && api_sign && api_ts && api_ver) {
    setExpireRedisKey({
      key: 'debank:api',
      expire: 60 * 5,
      value: JSON.stringify({ api_nonce, api_sign, api_ts: +api_ts, api_ver }),
    });
  }
};
export const getDebankAPISign = async () => {
  const debank_api = await getRedisKey('debank:api');
  const { api_nonce, api_sign, api_ts, api_ver } = debank_api
    ? JSON.parse(debank_api)
    : {
        api_nonce: '',
        api_sign: '',
        api_ts: '',
        api_ver: '',
      };
  return {
    api_nonce,
    api_sign,
    api_ts,
    api_ver,
  };
};

export const updateDebankIdForTokenCollection = async () => {
  const collection = mgClient.db('onchain').collection('token');
  const tokens = await collection
    .find({
      'ids.debank_id': { $exists: 0 },
    })
    .toArray();

  await Promise.all(
    tokens.map(async ({ _id, address }) => {
      const debankToken = await mgClient
        .db('onchain')
        .collection('debank-coin')
        .findOne({
          platform_token_id: new RegExp(address, 'i'),
        });
      if (debankToken) {
        await collection.findOneAndUpdate(
          {
            _id,
          },
          {
            $set: {
              'ids.debank_id': debankToken.id,
            },
          },
        );
      }
    }),
  );
};

export const getAddressBook = async ({ address }: { address: string }) => {
  const collection = mgClient.db('onchain').collection('address-book');
  const address_book = await collection.findOne({
    address,
  });
  return address_book;
};

export const getTokenTopHolders = async ({ id }) => {
  const collection = mgClient.db('onchain').collection('debank-top-holders');

  const top_holders = await collection.findOne(
    {
      id,
    },
    {
      sort: {
        updated_at: -1,
      },
    },
  );
  return { top_holders };
};

export const snapshotTokenTopHolders = async ({ id }) => {
  const collection = mgClient.db('onchain').collection('debank-top-holders');
  const { top_holders } = await getTokenTopHolders({ id });
  const { holders } = top_holders;
  const stats = {};
  await Promise.all(
    holders.map(async (address: string) => {
      const {
        address_book: { tags, labels } = {
          tags: [],
          labels: [],
        },
      } = (await getAddressBook({ address })) || {
        address_book: {
          tags: [],
          labels: [],
        },
      };
      // console.log('address_book', { address, address_book: { tags, labels } });
      Object.values(ACCOUNT_TAGS).forEach((tag) => {
        if (tags.includes(tag)) {
          stats[tag] = stats[tag] ? stats[tag] + 1 : 1;
        }
      });
    }),
  );
  // console.log('stats', { stats });
};
// snapshotTokenTopHolders({
//   id: 'anybtc',
// }).then(console.log);
