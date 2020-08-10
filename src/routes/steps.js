'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { update, addActivity } = require('../controllers/stepController');

exports.plugin = {
  name: 'routes-steps',
  register: async (server) => {
    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object({ name: Joi.string().required() }),
        },
        auth: { scope: ['programs:edit'] },
      },
      handler: update,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/activity',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object({ name: Joi.string().required() }),
        },
        auth: { scope: ['programs:edit'] },
      },
      handler: addActivity,
    });
  },
};
