'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { addActivityHistory, getByActivityId } = require('../controllers/activityHistoryController');
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
            questionnaireAnswersList: Joi.array().items(Joi.object({
              card: Joi.objectId().required(),
              answer: Joi.string().required(),
            })),
          }),
        },
        auth: { mode: 'required' },
        pre: [{ method: authorizeAddActivityHistory }],
      },
      handler: addActivityHistory,
    });

    server.route({
      method: 'GET',
      path: '/{_id}',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        auth: { mode: 'required' },
      },
      handler: getByActivityId,
    });
  },
};
