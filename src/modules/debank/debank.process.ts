import { Job } from 'bullmq';

export const workerProcessor = async function ({ name, data }: Job<any>) {
  return this.jobs[name as keyof typeof this.jobs]?.call(this, data) || this.jobs.default();
};
