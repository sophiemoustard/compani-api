'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { addActivityHistory } = require('../controllers/activityHistoryController');

exports.plugin = {
  name: 'routes-activity-histories',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          payload: Joi.object({
            user: Joi.objectId().required(),
            activity: Joi.objectId().required(),
            date: Joi.date(),
          }),
        },
        auth: { scope: ['programs:edit'] },
      },
      handler: addActivityHistory,
    });
  },
};
