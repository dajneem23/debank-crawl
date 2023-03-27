import { Job } from 'bullmq';
import { DefillamaJobData } from './defillama.job';

export const workerProcessor = async function ({ name, data }: Job<DefillamaJobData>) {
  return this.jobs[name as keyof typeof this.jobs]?.call(this, data) || this.jobs.default();
};
