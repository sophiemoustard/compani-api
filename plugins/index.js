const good = require('./good');
const hapiSentry = require('./hapiSentry');
const hapiAuthJwt2 = require('./hapiAuthJwt2');
const cron = require('./cron');
const { invoiceDispatch } = require('../jobs/invoiceDispatch');

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
          name: 'invoiceDispatch',
          time: '*/30 * * * * *',
          method: invoiceDispatch.method,
          onComplete: invoiceDispatch.onComplete,
          env: 'development',
        },
        {
          name: 'test',
          time: '*/20 * * * * *',
          method() {
            console.log('MEH');
          },
          onComplete() {
            console.log('OKOK');
          },
          env: 'development',
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
