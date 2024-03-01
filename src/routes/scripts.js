'use-strict';

const {
  updateRoleScript,
  eventConsistencyScript,
} = require('../controllers/scriptController');

exports.plugin = {
  name: 'routes-scripts',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/update-role',
      options: {
        auth: { scope: ['scripts:run'] },
      },
      handler: updateRoleScript,
    });

    server.route({
      method: 'GET',
      path: '/event-consistency',
      options: {
        auth: { scope: ['scripts:run'] },
      },
      handler: eventConsistencyScript,
    });
  },
};
