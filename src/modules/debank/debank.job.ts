export type fetchDebankDataJob = {
  name: DebankJobNames;
};

export type DebankJobNames = 'debank:fetch:project:list' | 'debank:add:project:users' | 'debank:fetch:project:users';
export type DebankJobData = fetchDebankDataJob;
