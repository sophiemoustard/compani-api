'use-strict';

const Joi = require('@hapi/joi');
Joi.objectId = require('joi-objectid')(Joi);
const { getById, update } = require('../controllers/activityController');

exports.plugin = {
  name: 'routes-activities',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/{_id}',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        auth: { scope: ['programs:read'] },
      },
      handler: getById,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object({ title: Joi.string().required() }),
        },
        auth: { scope: ['programs:edit'] },
      },
      handler: update,
    });
  },
};
