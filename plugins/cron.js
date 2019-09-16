'use strict';

const { CronJob } = require('cron');

const callJob = (server, job) => async () => job.method(server);

exports.plugin = {
  name: 'cron',
  register(server, options) {
    const jobs = {};

    if (!options.jobs || !options.jobs.length) {
      server.log(['cron'], 'No Jobs provided.');
    } else {
      for (const job of options.jobs) {
        if (!job.name) throw new Error('Job name is missing');
        if (!job.time) throw new Error('Job time is missing');
        if (!job.method || typeof job.method !== 'function') throw new Error('Job method is invalid.');
        if (job.onComplete && typeof job.onComplete !== 'function') throw new Error('Job onComplete must be a function.');
        if (jobs[job.name]) throw new Error('Job already defined.');

        try {
          jobs[job.name] = new CronJob(job.time, callJob(server, job), job.onComplete, false, 'Europe/Paris');
        } catch (e) {
          server.log(['error', 'cron'], e);
        }
      }

      server.ext('onPostStart', () => {
        for (const key in jobs) {
          jobs[key].start();
        }
      });

      server.ext('onPreStop', () => {
        for (const key in jobs) {
          jobs[key].stop();
        }
      });
    }
  },
};
