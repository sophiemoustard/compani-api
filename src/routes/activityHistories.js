'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { addActivityHistory, list } = require('../controllers/activityHistoryController');
const { authorizeAddActivityHistory, authorizeHistoriesList } = require('./preHandlers/activityHistories');

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
              answerList: Joi.array().items(Joi.string()).min(1).required(),
            })),
            score: Joi.number().required(),
            duration: Joi.string().required(),
          }),
        },
        auth: { mode: 'required' },
        pre: [{ method: authorizeAddActivityHistory }],
      },
      handler: addActivityHistory,
    });

    server.route({
      method: 'GET',
      path: '/',
      options: {
        validate: {
          query: Joi.object({
            startDate: Joi.date().required(),
            endDate: Joi.date().required().greater(Joi.ref('startDate')),
          }),
        },
        auth: { scope: ['courses:read'] },
        pre: [{ method: authorizeHistoriesList }],
      },
      handler: list,
    });
  },
};
