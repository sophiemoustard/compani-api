'use-strict';

const Joi = require('joi');
const {
  eventRepetitionsScript,
  updateRoleScript,
  eventConsistencyScript,
} = require('../controllers/scriptController');

exports.plugin = {
  name: 'routes-scripts',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/events-repetitions',
      options: {
        auth: { scope: ['scripts:run'] },
        validate: {
          query: Joi.object({ date: Joi.date(), type: Joi.string() }),
        },
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
