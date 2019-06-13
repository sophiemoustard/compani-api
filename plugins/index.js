const good = require('./good');
const hapiSentry = require('./hapiSentry');

const plugins = [
  {
    plugin: require('good'),
    options: { reporters: good.reporters }
  },
  { plugin: require('hapi-auth-jwt2') },
  { plugin: require('inert') }
];

if (process.env.NODE_ENV === 'production') {
  plugins.push({
    plugin: require('hapi-sentry'),
    options: hapiSentry.options
  });
}

exports.plugins = plugins;
