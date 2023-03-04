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
}

export type DebankJobData = fetchDebankDataJob;
