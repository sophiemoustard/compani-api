const good = require('./good');
const hapiSentry = require('./hapiSentry');

exports.plugins = [
  {
    plugin: require('good'),
    options: { reporters: good.reporters }
  },
  { plugin: require('hapi-auth-jwt2') },
  { plugin: require('inert') },
  {
    plugin: require('hapi-sentry'),
    options: hapiSentry.options,
  },
];
