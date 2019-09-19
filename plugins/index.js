const good = require('./good');
const hapiSentry = require('./hapiSentry');
const hapiAuthJwt2 = require('./hapiAuthJwt2');
const cron = require('./cron');
const billDispatch = require('../jobs/billDispatch');

const plugins = [
  {
    plugin: require('good'),
    options: { reporters: good.reporters },
  },
  { plugin: hapiAuthJwt2 },
  { plugin: require('inert') },
  {
    plugin: cron,
    options: {
      jobs: [
        {
          name: 'billDispatch',
          time: '0 0 5 * * *',
          method: billDispatch.method,
          onComplete: billDispatch.onComplete,
          env: 'production',
        },
      ],
    },
  },
];

if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
  plugins.push({
    plugin: require('hapi-sentry'),
    options: hapiSentry.options,
  });
}

exports.plugins = plugins;
