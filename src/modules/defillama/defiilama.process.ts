import { Job } from 'bullmq';
import { DefillamaJobData } from './defillama.job';

export const workerProcessor = async function ({ name, data }: Job<DefillamaJobData>) {
  // this.logger.debug('info', `[defillama:workerProcessor:run]`, { name, data });
  return (this as any).jobs[name as keyof typeof this.jobs]?.call(this, data) || (this as any).jobs.default();
};
