'use strict';

const { getOgustToken } = require('../../controllers/Ogust/tokenController');

exports.plugin = {
  name: 'routes-ogust-utils',
  register: async (server) => {
    // Get Ogust token
    server.route({
      method: 'GET',
      path: '/token',
      options: { auth: 'jwt' },
      handler: getOgustToken,
    });
  }
};
