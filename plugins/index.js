let reporters = {};
if (process.env.NODE_ENV !== 'test') {
  reporters = {
    console: [{
        module: 'good-squeeze',
        name: 'Squeeze',
        args: [{
          log: '*',
          response: '*'
        }]
      },
      {
        module: 'good-console'
      },
      'stdout'
    ]
  }
}
exports.plugins = [
  {
    plugin: require('good'),
    options: {
      reporters
      }
  }
  { plugin: require('hapi-auth-jwt2') },
];
