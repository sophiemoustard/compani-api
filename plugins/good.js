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
      args: [{ log: { exclude: ['log', 'info'] }, request: { include: ['request', 'error'], exclude: ['db'] } }]
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

module.exports = { reporters };
