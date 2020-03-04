'use-strict';

const Joi = require('@hapi/joi');
const { list, create } = require('../controllers/courseController');

exports.plugin = {
  name: 'routes-courses',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['courses:read'] },
      },
      handler: list,
    });

    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          payload: Joi.object({
            name: Joi.string().required(),
          }),
        },
        auth: { scope: ['courses:edit'] },
      },
      handler: create,
    });
  },
};
