import { Job } from 'bullmq';
import { jobs } from './debank.job';

export const workerProcessor = async function ({ name, data }: Job<any>) {
  return jobs[name as keyof typeof jobs]?.call(null, data) || jobs.default();
};
