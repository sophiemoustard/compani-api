'use-strict';

const { get } = require('../controllers/vendorCompanyController');

exports.plugin = {
  name: 'routes-vendor-company',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['config:vendor'] },
      },
      handler: get,
    });
  },
};
