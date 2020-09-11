'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { addActivityHistory } = require('../controllers/activityHistoryController');
const { authorizeAddActivityHistory } = require('./preHandlers/activityHistories');

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
          }),
        },
        auth: { mode: 'required' },
        pre: [{ method: authorizeAddActivityHistory }],
      },
      handler: addActivityHistory,
    });
  },
};
