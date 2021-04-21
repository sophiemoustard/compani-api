'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { addQuestionnaireHistory } = require('../controllers/questionnaireHistoryController');
const { authorizeAddQuestionnaireHistory } = require('./preHandlers/questionnaireHistories');

exports.plugin = {
  name: 'routes-questionnaire-histories',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          payload: Joi.object({
            course: Joi.objectId().required(),
            user: Joi.objectId().required(),
            questionnaire: Joi.objectId().required(),
            questionnaireAnswersList: Joi.array().items(Joi.object({
              card: Joi.objectId().required(),
              answerList: Joi.array().items(Joi.string()).min(1).required(),
            })),
          }),
        },
        auth: { mode: 'required' },
        pre: [{ method: authorizeAddQuestionnaireHistory }],
      },
      handler: addQuestionnaireHistory,
    });
  },
};
