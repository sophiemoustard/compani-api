'use-strict';

const { seedDb } = require('../controllers/endToEndController');
const { authorizeDatabaseSeed } = require('./preHandlers/endToEnd');

exports.plugin = {
  name: 'routes-e2e',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/seed',
      options: {
        auth: false,
        pre: [{ method: authorizeDatabaseSeed }],
      },
      handler: seedDb,
    });
  },
};
