import { env } from 'process';

import { DebankJobNames } from './debank.job';

import { queue } from './debank.queue';
import { logger } from './debank.config';

export class DebankService {
  constructor() {
    // TODO: CHANGE THIS TO PRODUCTION
    if (env.MODE === 'production') {
      // Init Worker
      this.initWorker();
      this.initRepeatJobs();
    }
  }

  /**
   *  @description init BullMQ Worker
   */
  private async initWorker() {
    await import('./debank.worker');
    logger.debug('info', '[initWorker:debank]', 'Worker initialized');
  }

  private initRepeatJobs() {
    //DB Job
    // queue.add(
    //   DebankJobNames['debank:create:partitions'],
    //   {},
    //   {
    //     repeatJobKey: 'debank:create:partitions',
    //     jobId: `debank:create:partitions`,
    //     removeOnComplete: {
    //       //remove after 1 hour
    //       age: 60 * 60,
    //     },
    //     removeOnFail: {
    //       //remove after 1 day
    //       age: 60 * 60 * 24,
    //     },
    //     repeat: {
    //       //repeat every day
    //       every: 1000 * 60 * 60 * 24,
    //       // pattern: '* 0 0 * * *',
    //     },
    //     //delay for 5 minutes when the job is added for done other jobs
    //     delay: 1000 * 60 * 5,
    //     priority: 1,
    //     attempts: 5,
    //   },
    // );

    // queue.add(
    //   DebankJobNames['debank:clean:outdated-data'],
    //   {},
    //   {
    //     repeatJobKey: 'debank:clean:outdated-data',
    //     jobId: 'debank:clean:outdated-data',
    //     removeOnComplete: {
    //       //remove after 1 hour
    //       age: 60 * 60,
    //     },
    //     removeOnFail: {
    //       //remove after 1 day
    //       age: 60 * 60 * 24,
    //     },
    //     repeat: {
    //       //repeat every day
    //       every: 1000 * 60 * 60 * 24,
    //       // pattern: '* 0 0 * * *',
    //     },
    //     //delay for 5 minutes when the job is added for done other jobs
    //     delay: 1000 * 60 * 5,
    //     priority: 1,
    //     attempts: 5,
    //   },
    // );

    queue.add(
      DebankJobNames['debank:add:fetch:protocols:pools'],
      {},
      {
        repeatJobKey: 'debank:add:fetch:protocols:pools',
        jobId: `debank:add:fetch:protocols:pools`,
        removeOnComplete: {
          //remove after 1 hour
          age: 60 * 60,
        },
        removeOnFail: {
          //remove after 1 day
          age: 60 * 60 * 24,
        },
        repeat: {
          //repeat every day
          every: 1000 * 60 * 60 * 24,
          // pattern: '* 0 0 * * *',
        },
        //delay for 5 minutes when the job is added for done other jobs
        delay: 1000 * 60 * 5,
        priority: 1,
        attempts: 5,
      },
    );

    // queue.add(
    //   DebankJobNames['debank:add:fetch:user-address:top-holders'],
    //   {},
    //   {
    //     repeatJobKey: 'debank:add:fetch:user-address:top-holders',
    //     jobId: `debank:add:fetch:user-address:top-holders`,
    //     removeOnComplete: {
    //       //remove after 1 hour
    //       age: 60 * 60 * 24,
    //     },
    //     removeOnFail: {
    //       //remove after 1 hour
    //       age: 60 * 60 * 24,
    //     },
    //     repeat: {
    //       //repeat every 3 hours
    //       every: 1000 * 60 * 60 * 24,
    //       // pattern: '* 0 0 * * *',
    //     },
    //     //delay for 5 minutes when the job is added for done other jobs
    //     delay: 1000 * 60 * 5,
    //     priority: 3,
    //     attempts: 5,
    //   },
    // );
    queue.add(
      DebankJobNames['debank:add:fetch:coins'],
      {},
      {
        repeatJobKey: 'debank:add:fetch:coins',
        repeat: {
          //repeat every 24 hours
          every: 1000 * 60 * 60 * 24,
          // pattern: '* 0 0 * * *',
        },
        priority: 1,
        attempts: 5,
      },
    );

    queue.add(
      DebankJobNames['debank:add:fetch:top-holders'],
      {},
      {
        repeatJobKey: 'debank:add:fetch:top-holders',
        jobId: `debank:add:fetch:top-holders`,
        removeOnComplete: {
          //remove after 1 hour
          age: 60 * 60 * 1,
        },
        removeOnFail: {
          //remove after 1 hour
          age: 60 * 60 * 1,
        },
        repeat: {
          //repeat every 60 minutes
          every: 1000 * 60 * 60 * 4,
          // pattern: '* 0 0 * * *',
        },
        priority: 2,
        attempts: 5,
      },
    );

    queue.add(
      DebankJobNames['debank:add:snapshot:users:project'],
      {},
      {
        repeatJobKey: 'debank:add:snapshot:users:project',
        jobId: `debank:add:snapshot:users:project`,
        removeOnComplete: {
          //remove after 1 hour
          age: 60 * 60 * 1,
        },
        removeOnFail: {
          //remove after 1 hour
          age: 60 * 60 * 1,
        },
        repeat: {
          //repeat every 60 minutes
          every: 1000 * 60 * 60 * 4,
          // pattern: '* 0 0 * * *',
        },
        priority: 2,
        attempts: 5,
      },
    );
    queue.add(
      DebankJobNames['debank:add:social:users:rankings'],
      {},
      {
        repeatJobKey: 'debank:add:social:users:rankings',
        jobId: `debank:add:social:users:rankings`,
        removeOnComplete: {
          //remove job after 1 hours
          age: 60 * 60 * 24,
        },
        removeOnFail: {
          //remove job after 1 hours
          age: 60 * 60 * 24,
        },
        repeat: {
          //repeat every 3 hours
          every: 1000 * 60 * 60 * 24,
          // pattern: '* 0 0 * * *',
        },
        priority: 2,
        attempts: 5,
      },
    );
    queue.add(
      DebankJobNames['debank:add:fetch:whales:paging'],
      {},
      {
        repeatJobKey: 'debank:add:fetch:whales:paging',
        jobId: `debank:add:fetch:whales:paging`,
        removeOnComplete: {
          //remove job after 1 hours
          age: 60 * 60 * 24,
        },
        removeOnFail: {
          //remove job after 1 hours
          age: 60 * 60 * 24,
        },
        repeat: {
          //repeat every 24 hours
          every: 1000 * 60 * 60 * 24,
        },
        priority: 2,
        attempts: 5,
      },
    );
  }
}
