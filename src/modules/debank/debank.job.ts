import {
  insertDebankCoin,
  insertDebankTopHolder,
  insertDebankUserAddress,
  insertDebankUserAssetPortfolio,
  insertDebankWhale,
} from './debank.fnc';
import { addFetchCoinsJob } from './helper/coin';
import { cleanOutdatedData, createPartitions } from './helper/partition';
import {
  addSnapshotUsersProjectJob,
  crawlPortfolioByList,
  crawlUsersProject,
  fetchUserPortfolio,
} from './helper/portfolio';
import { addFetchProtocolPoolsById, addFetchProtocolPoolsJob, fetchProtocolPoolsPage } from './helper/protocol';
import { addFetchSocialRankingJob, fetchSocialRankingsPage } from './helper/ranking';
import {
  addFetchTopHoldersByUsersAddressJob,
  addFetchTopHoldersJob,
  crawlTopHolders,
  fetchTopHolders,
  fetchTopHoldersPage,
} from './helper/top-holders';
import { addFetchWhalesPagingJob, fetchWhalesPage } from './helper/whale';

export type fetchDebankDataJob = {
  name: DebankJobNames;
};

export enum DebankJobNames {
  'debank:fetch:project:list' = 'debank:fetch:project:list',
  'debank:add:project:users' = 'debank:add:project:users',
  'debank:fetch:project:users' = 'debank:fetch:project:users',
  'debank:add:social:users' = 'debank:add:social:users',
  'debank:fetch:social:user' = 'debank:fetch:social:user',
  'debank:fetch:social:rankings:page' = 'debank:fetch:social:rankings:page',
  'debank:add:social:users:rankings' = 'debank:add:social:users:rankings',
  'debank:fetch:user:project-list' = 'debank:fetch:user:project-list',
  'debank:fetch:user:assets-portfolios' = 'debank:fetch:user:assets-portfolios',
  'debank:fetch:user:token-balances' = 'debank:fetch:user:token-balances',
  'debank:fetch:whales:page' = 'debank:fetch:whales:page',
  'debank:add:fetch:whales:paging' = 'debank:add:fetch:whales:paging',
  'debank:insert:whale' = 'debank:insert:whale',
  'debank:fetch:whales' = 'debank:fetch:whales',
  'debank:add:fetch:whales' = 'debank:add:fetch:whales',
  'debank:fetch:top-holders' = 'debank:fetch:top-holders',
  'debank:fetch:top-holders:page' = 'debank:fetch:top-holders:page',
  'debank:insert:top-holder' = 'debank:insert:top-holder',
  'debank:insert:user-address' = 'debank:insert:user-address',
  'debank:insert:user-assets-portfolio' = 'debank:insert:user-assets-portfolio',
  'debank:insert:coin' = 'debank:insert:coin',
  'debank:add:fetch:coins' = 'debank:add:fetch:coins',
  'debank:add:fetch:top-holders' = 'debank:add:fetch:top-holders',
  'debank:add:fetch:user-address:top-holders' = 'debank:add:fetch:user-address:top-holders',

  'debank:create:partitions' = 'debank:create:partitions',

  'debank:clean:outdated-data' = 'debank:clean:outdated-data',
  'debank:crawl:portfolio' = 'debank:crawl:portfolio',

  'debank:crawl:portfolio:list' = 'debank:crawl:portfolio:list',
  'debank:crawl:top-holders' = 'debank:crawl:top-holders',

  'debank:fetch:protocols:pools:page' = 'debank:fetch:protocols:pools:page',

  'debank:add:fetch:protocols:pools:id' = 'debank:add:fetch:protocols:pools:id',

  'debank:add:fetch:protocols:pools' = 'debank:add:fetch:protocols:pools',

  'debank:crawl:users:project' = 'debank:crawl:users:project',

  'debank:add:snapshot:users:project' = 'debank:add:snapshot:users:project',

  'debank:fetch:user:portfolio' = 'debank:fetch:user:portfolio',
}

export type DebankJobData = fetchDebankDataJob;

export const jobs: {
  [key in DebankJobNames | 'default']?: (payload?: any) => any;
} = {
  'debank:fetch:social:rankings:page': fetchSocialRankingsPage,
  'debank:fetch:whales:page': fetchWhalesPage,
  'debank:insert:whale': insertDebankWhale,
  'debank:insert:user-address': insertDebankUserAddress,
  'debank:insert:user-assets-portfolio': insertDebankUserAssetPortfolio,
  'debank:insert:coin': insertDebankCoin,
  'debank:fetch:top-holders': fetchTopHolders,
  'debank:fetch:top-holders:page': fetchTopHoldersPage,
  'debank:insert:top-holder': insertDebankTopHolder,

  // 'debank:crawl:portfolio': crawlPortfolio,
  'debank:crawl:portfolio:list': crawlPortfolioByList,

  'debank:fetch:user:portfolio': fetchUserPortfolio,

  'debank:crawl:users:project': crawlUsersProject,

  'debank:add:snapshot:users:project': addSnapshotUsersProjectJob,

  //! DEPRECATED
  // 'debank:add:project:users': addFetchProjectUsersJobs,

  //!PAUSED
  'debank:add:fetch:coins': addFetchCoinsJob,

  // 'debank:add:social:users': addFetchSocialRankingByUsersAddressJob,
  //! RUNNING
  'debank:add:social:users:rankings': addFetchSocialRankingJob,
  //! RUNNING
  'debank:add:fetch:whales:paging': addFetchWhalesPagingJob,
  //! RUNNING
  'debank:add:fetch:top-holders': addFetchTopHoldersJob,
  //! RUNNING
  'debank:add:fetch:user-address:top-holders': addFetchTopHoldersByUsersAddressJob,

  'debank:crawl:top-holders': crawlTopHolders,

  'debank:add:fetch:protocols:pools': addFetchProtocolPoolsJob,

  'debank:fetch:protocols:pools:page': fetchProtocolPoolsPage,

  'debank:add:fetch:protocols:pools:id': addFetchProtocolPoolsById,

  //* PARTITION JOBS
  'debank:create:partitions': createPartitions,

  'debank:clean:outdated-data': cleanOutdatedData,
  default: () => {
    throw new Error('Invalid job name');
  },
};
