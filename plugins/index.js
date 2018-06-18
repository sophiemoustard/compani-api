exports.plugins = [
  {
    plugin: require('good'),
    options: {
      reporters: {
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
  },
  { plugin: require('hapi-auth-jwt2') },
];
