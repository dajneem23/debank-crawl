import { formatDate } from '@/utils/date';
import { mgClient, pgClient, pgp } from '../debank.config';
import { bulkInsert, bulkInsertOnConflict } from '@/utils/pg';
import { DebankAPI } from '@/common/api';

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
  const { rows } = await pgClient.query(`
  SELECT ${select} FROM "debank-pools"
  ${where ? `WHERE ${where}` : ''}
`);
  return { rows };
};

export const queryDebankProtocols = async () => {
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
  const { rows } = await pgClient.query(
    `SELECT ${select} FROM "debank-social-ranking" ORDER BY ${orderBy} ${order} LIMIT ${limit}`,
  );
  return { rows };
};
export const queryDebankTopHoldersImportantToken = async () => {
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
  const { rows } = await pgClient.query(
    `  ${select} FROM "debank-user-address-list"
    ${where ? 'WHERE ' + where : ''}
    ORDER BY ${orderBy} ${order}  ${limit ? 'LIMIT ' + limit : ''}`,
  );
  return {
    rows,
  };
};
export const queryDebankCoins = async (
  { select = 'symbol, details' } = {
    select: 'symbol, details',
  },
) => {
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
  const { rows } = await pgClient.query(`
    SELECT ${select}  FROM "debank-important-tokens"
  `);
  return { rows };
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
  }
};

export const updateDebankUserProfile = async ({ address, profile }: { address: string; profile: any }) => {
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

export const insertDebankWhale = async ({
  whale,
  crawl_id,
  updated_at,
}: {
  whale: any;
  crawl_id: number;
  updated_at?: Date;
}) => {
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

  const { rows } = await pgClient.query(
    `SELECT user_address FROM "debank-project-users" WHERE project_id = $1 GROUP BY user_address`,
    [projectId],
  );
  return { rows };
};

export const getDebankWhalesCrawlId = async () => {
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

export const getDebankCoinsCrawlId = async () => {
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
export const queryDebankAllCoins = async () => {
  const { rows } = await pgClient.query(`
      SELECT symbol, details, db_id FROM "debank-coins"
    `);
  return rows;
};
