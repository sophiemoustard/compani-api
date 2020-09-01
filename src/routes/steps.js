'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { authorizeActivityAdd, authorizeActivityReuse } = require('./preHandlers/steps');
const { update, addActivity, detachActivity } = require('../controllers/stepController');
const { ACTIVITY_TYPES } = require('../models/Activity');
const { authorizeActivityDetachment } = require('./preHandlers/steps');

const activityIdExists = { is: Joi.exist(), then: Joi.forbidden(), otherwise: Joi.required() };

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
        pre: [{ method: authorizeActivityReuse }],
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
            name: Joi.string().when('activityId', activityIdExists),
            type: Joi.string().when('activityId', activityIdExists).valid(...ACTIVITY_TYPES),
            activityId: Joi.objectId(),
          }),
        },
        auth: { scope: ['programs:edit'] },
        pre: [{ method: authorizeActivityAdd }],
      },
      handler: addActivity,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}/activities/{activityId}',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required(), activityId: Joi.objectId().required() }),
        },
        auth: { scope: ['programs:edit'] },
        pre: [{ method: authorizeActivityDetachment }],
      },
      handler: detachActivity,
    });
  },
};
