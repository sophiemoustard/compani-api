const { list } = require('../controllers/partnerController');

exports.plugin = {
  name: 'routes-partners',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['partners:read'] },
      },
      handler: list,
    });
  },
};
