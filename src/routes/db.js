
'use-strict';

const { seedDb } = require('../controllers/dbController');

exports.plugin = {
  name: 'routes-db',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/seed',
      options: { auth: false },
      handler: seedDb,
    });
  },
};
