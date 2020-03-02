const good = require('./good');
const hapiSentry = require('./hapiSentry');
const hapiAuthJwt2 = require('./hapiAuthJwt2');
const cron = require('./cron');
const billDispatch = require('../jobs/billDispatch');
const eventRepetitions = require('../jobs/eventRepetitions');
const updateRole = require('../jobs/updateRole');

const plugins = [
  {
    plugin: require('good'),
    options: { reporters: good.reporters },
  },
  { plugin: hapiAuthJwt2 },
  { plugin: require('@hapi/inert') },
  {
    plugin: cron,
    options: {
      jobs: [
        {
          name: 'billDispatch',
          time: '0 0 5 * * *',
          request: {
            method: 'GET',
            url: '/scripts/bill-dispatch',
            credentials: { scope: ['scripts:run'] },
          },
          onComplete: billDispatch.onComplete,
          env: 'production',
        },
        {
          name: 'eventRepetitions',
          time: '0 0 4 * * *',
          request: {
            method: 'GET',
            url: '/scripts/events-repetitions',
            credentials: { scope: ['scripts:run'] },
          },
          onComplete: eventRepetitions.onComplete,
        },
        {
          name: 'roleUpdate',
          time: '0 0 6 1 * *',
          request: {
            method: 'GET',
            url: '/scripts/update-role',
            credentials: { scope: ['scripts:run'] },
          },
          onComplete: updateRole.onComplete,
        },
      ],
    },
  },
];

if (['production', 'staging'].includes(process.env.NODE_ENV)) {
  plugins.push({
    plugin: require('hapi-sentry'),
    options: hapiSentry.options,
  });
}

exports.plugins = plugins;
