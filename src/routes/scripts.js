const { billDispatchScript, eventRepetitionsScript, updateRoleScript } = require('../controllers/scriptController');

exports.plugin = {
  name: 'routes-scripts',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/bill-dispatch',
      options: {
        auth: { scope: ['scripts:run'] },
      },
      handler: billDispatchScript,
    });

    server.route({
      method: 'GET',
      path: '/events-repetitions',
      options: {
        auth: { scope: ['scripts:run'] },
      },
      handler: eventRepetitionsScript,
    });

    server.route({
      method: 'GET',
      path: '/update-role',
      options: {
        auth: { scope: ['scripts:run'] },
      },
      handler: updateRoleScript,
    });
  },
};
