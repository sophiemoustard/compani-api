const good = require('./good');
const hapiAuthJwt2 = require('./hapiAuthJwt2');
const cron = require('./cron');

const plugins = [
  {
    plugin: require('@hapi/good'),
    options: { reporters: good.reporters },
  },
  { plugin: hapiAuthJwt2 },
  { plugin: require('@hapi/inert') },
  {
    plugin: cron,
    options: {
      jobs: [
      ],
    },
  },
];

if (['production', 'staging'].includes(process.env.NODE_ENV)) {
  plugins.push({
    plugin: require('hapi-sentry'),
    options: {
      client: {
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
      },
      trackUser: false,
    },
  });
}

exports.plugins = plugins;
