'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { update, addActivity } = require('../controllers/stepController');
const { ACTIVITY_TYPES } = require('../models/Activity');

const isActivityId = { is: Joi.exist(), then: Joi.forbidden(), otherwise: Joi.required() };

exports.plugin = {
  name: 'routes-steps',
  register: async (server) => {
    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object({ name: Joi.string(), activities: Joi.objectId() }),
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
            name: Joi.string().when('activityId', isActivityId),
            type: Joi.string().when('activityId', isActivityId).valid(...ACTIVITY_TYPES),
            activityId: Joi.objectId(),
          }),
        },
        auth: { scope: ['programs:edit'] },
      },
      handler: addActivity,
    });
  },
};
