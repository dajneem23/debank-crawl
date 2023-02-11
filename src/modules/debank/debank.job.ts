export type fetchDebankDataJob = {
  name: DebankJobNames;
};

export type DebankJobNames =
  | 'debank:fetch:project:list'
  | 'debank:add:project:users'
  | 'debank:fetch:project:users'
  | 'debank:add:social:users'
  | 'debank:fetch:social:user'
  | 'debank:fetch:social:rankings:page'
  | 'debank:add:social:users:rankings'
  | 'debank:fetch:user:project-list'
  | 'debank:fetch:user:assets-portfolios'
  | 'debank:fetch:user:token-balances'
  | 'debank:fetch:whales:page'
  | 'debank:add:fetch:whales:paging'
  | 'debank:insert:whale'
  | 'debank:insert:top-holder'
  | 'debank:insert:user-address'
  | 'debank:insert:user-assets-portfolio'
  | 'debank:insert:coin'
  | 'debank:add:fetch:coins'
  | 'debank:fetch:top-holders'
  | 'debank:fetch:top-holders:page'
  | 'debank:add:fetch:top-holders'
  | 'debank:add:fetch:user-address:top-holders';

export type DebankJobData = fetchDebankDataJob;
