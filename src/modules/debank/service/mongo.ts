import { formatDate } from '@/utils/date';
import { mgClient } from '../debank.config';
import { filter, findKey, isNil, uniq } from 'lodash';
import { ACCOUNT_TAGS, NULL_ACCOUNT } from '@/types/account';
import { bulkInsert } from '@/utils/pg';
import { queryDebankPools } from './pg';
import { isDolphin, isKOL, isMM, isSM, isTokenFan, isVC, isWhale } from './label-snapshot';

export const insertDebankPoolsToMongo = async () => {
  const { rows } = await queryDebankPools();
  await mgClient.db('onchain').collection('debank-pools').insertMany(rows);
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
export const getDebankTopHoldersCrawlId = async () => {
  const lastCrawlId = await mgClient
    .db('onchain')
    .collection('debank-top-holders')
    .findOne(
      {},
      {
        sort: { crawl_id: -1 },
      },
    );
  if (lastCrawlId?.crawl_id && lastCrawlId.crawl_id) {
    const crawl_id = lastCrawlId.crawl_id.toString();
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

export const bulkWriteUsersProject = async (data: any[]) => {
  const collection = mgClient.db('onchain-dev').collection('account-project-snapshot');
  await collection.insertMany(data);
};
export const getAccountsFromTxEvent = async () => {
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
    address: new RegExp(address, 'i'),
  });
  return address_book;
};

export const getAddressesTagsFromAddressBook = async ({ addresses }: { addresses: string[] }) => {
  const collection = mgClient.db('onchain').collection('address-book');
  const tags = await collection
    .aggregate([
      {
        $match: {
          address: {
            $in: addresses,
          },
        },
      },
      {
        $project: {
          address: 1,
          tags: 1,
          labels: 1,
        },
      },
    ])
    .toArray();
  return tags;
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
  //TODO: upsert by crawl_id
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
  const dolphin_label = isDolphin(mgData.stats.total_net_usd_value);
  const whale_label = isWhale(mgData.stats.total_net_usd_value);
  const tokenFan_label = await isTokenFan({
    balance_list: mgData.balance_list,
    usd_value: mgData.stats.total_net_usd_value,
  });
  await mgClient
    .db('onchain')
    .collection('account-label-snapshot')
    .findOneAndUpdate(
      {
        address: user_address,
        crawl_id: +crawl_id,
      },
      {
        $set: {
          address: user_address,
          crawl_id: +crawl_id,
          updated_at: crawl_time,
          usd_value: mgData.stats.total_net_usd_value,
          labels: [
            ...((dolphin_label && [dolphin_label]) || []),
            ...((whale_label && [whale_label]) || []),
            ...((tokenFan_label && [tokenFan_label]) || []),
          ],
          tags,
        },
      },
      {
        upsert: true,
      },
    );
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
  const MGValues = holders.map(({ id }) => {
    return id;
  });
  const accounts = await getAddressesTagsFromAddressBook({
    addresses: MGValues,
  });
  const stats = accounts.reduce((acc: any, { address, tags }: any) => {
    if (!tags || !tags.length) return acc;
    Object.values(ACCOUNT_TAGS).forEach((tag) => {
      if (tags.includes(tag)) {
        const index = acc.findIndex(({ tag: _tag }: any) => _tag == tag);
        if (index > -1) {
          acc[index].count += 1;
        } else {
          acc.push({
            tag,
            name: findKey(ACCOUNT_TAGS, (t) => t == tag),
            count: 1,
            amount: 0,
          });
        }
      }
    });
    return acc;
  }, []);

  accounts.forEach(({ address, tags }) => {
    if (!tags || !tags.length) return;
    Object.values(ACCOUNT_TAGS).forEach((tag) => {
      if (tags.includes(tag)) {
        const index = stats.findIndex(({ tag: _tag }: any) => _tag == tag);
        const amount = holders.find(({ id }) => id == address)?.amount || 0;
        if (index > -1) {
          stats[index].amount += amount;
        } else {
          stats.push({
            tag,
            name: findKey(ACCOUNT_TAGS, (t) => t == tag),
            amount,
          });
        }
      }
    });
  });
  await mgClient.db('onchain').collection('debank-top-holders').insertOne({
    id,
    updated_at: new Date(),
    holders: MGValues,
    crawl_id: +crawl_id,
    stats,
  });
  // const PGvalues = holders.map((holder) => ({
  //   symbol: id,
  //   details: JSON.stringify(holder).replace(/\\u0000/g, ''),
  //   user_address: holder.id,
  //    crawl_id: +crawl_id,
  //   crawl_time,
  // }));
  // await bulkInsert({
  //   data: PGvalues,
  //   table: 'debank-top-holders',
  // });
};

export const getDebankCoinIds = async () => {
  const coins = await mgClient
    .db('onchain')
    .collection('debank-coin')
    .aggregate([
      {
        $match: {
          id: {
            $ne: null,
          },
        },
      },
      {
        $project: {
          id: 1,
        },
      },
    ])
    .toArray();
  return coins;
};
