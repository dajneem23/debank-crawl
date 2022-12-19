export type fetchDebankDataJob = {
  name: DebankJobNames;
};

export type DebankJobNames =
  | 'debank:fetch:project:list'
  | 'debank:add:project:users'
  | 'debank:fetch:project:users'
  | 'debank:add:social:users'
  | 'debank:fetch:social:user';
export type DebankJobData = fetchDebankDataJob;
