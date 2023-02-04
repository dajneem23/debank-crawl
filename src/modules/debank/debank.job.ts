export type fetchDebankDataJob = {
  name: DebankJobNames;
};

export type DebankJobNames =
  | 'debank:fetch:project:list'
  | 'debank:add:project:users'
  | 'debank:fetch:project:users'
  | 'debank:add:social:users'
  | 'debank:fetch:social:user'
  | 'debank:fetch:social:rankings'
  | 'debank:add:social:users:rankings'
  | 'debank:fetch:user:project-list'
  | 'debank:fetch:user:assets-portfolios'
  | 'debank:fetch:user:token-balances'
  | 'debank:fetch:whales:paging'
  | 'debank:add::fetch:whales:paging'
  | 'debank:insert:whale';

export type DebankJobData = fetchDebankDataJob;
