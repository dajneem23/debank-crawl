import { Job } from 'bullmq';

export const workerProcessor = async function ({ name, data }: Job<any>) {
  // this.logger.debug('info', `[defillama:workerProcessor:run]`, { name, data });
  return (this as any).jobs[name as keyof typeof this.jobs]?.call(this, data) || (this as any).jobs.default();
};
