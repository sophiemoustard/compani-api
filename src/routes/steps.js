'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { update, addActivity } = require('../controllers/stepController');
const { ACTIVITY_TYPES } = require('../models/Activity');

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
      path: '/{_id}/activities',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object({
            name: Joi.string().required(),
            type: Joi.string().required().valid(...ACTIVITY_TYPES),
          }),
        },
        auth: { scope: ['programs:edit'] },
      },
      handler: addActivity,
    });
  },
};
