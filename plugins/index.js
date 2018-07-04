let reporters = {};
if (process.env.NODE_ENV !== 'test') {
  reporters = {
    console: [{
      module: 'good-squeeze',
      name: 'Squeeze',
      args: [{
        log: '*',
        response: '*',
        request: '*'
      }]
    },
    {
      module: 'good-console'
    },
    'stdout'
    ]
  };
} else {
  reporters = {
    console: [{
      module: 'good-squeeze',
      name: 'Squeeze',
      args: [{ log: '*', request: { include: 'error', exclude: 'db' } }]
    },
    {
      module: 'good-console',
      args: [{
        format: 'DDMMYYYY-HH:MM:ss'
      }]
    },
    'stdout'
    ],
  };
}
exports.plugins = [
  {
    plugin: require('good'),
    options: {
      reporters
    }
  },
  { plugin: require('hapi-auth-jwt2') },
];
