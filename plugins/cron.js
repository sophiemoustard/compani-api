'use strict';

const { CronJob } = require('cron');

exports.plugin = {
  name: 'cron',
  register: (server, options) => {
    const jobs = {};

    if (!options.jobs || !options.jobs.length) {
      server.log(['cron'], 'No Jobs provided.');
    } else {
      for (const job of options.jobs) {
        if (!job.name) throw new Error('Job name is missing');
        if (!job.time) throw new Error('Job time is missing');
        if (!job.method || typeof job.method !== 'function') throw new Error('Job method is invalid.');
        if (jobs[job.name]) throw new Error('Job already defined.');

        try {
          jobs[job.name] = new CronJob(job.time, job.method, null, false, 'Europe/Paris');
        } catch (e) {
          server.log(['error', 'cron'], e);
        }
      }

      server.ext('onPostStart', () => {
        for (const key in jobs) {
          jobs[key].start();
          console.log('MEH');
        }
      });

      server.ext('onPreStop', () => {
        for (const key in jobs) {
          jobs[key].stop();
          console.log('DEH');
        }
      });
    }
  },
};
