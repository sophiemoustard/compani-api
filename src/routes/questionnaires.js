'use-strict';

const Joi = require('joi');
const { QUESTIONNAIRE_TYPES } = require('../models/Questionnaire');
const { list, create } = require('../controllers/questionnaireController');

exports.plugin = {
  name: 'routes-questionnaires',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['questionnaires:read'] },
      },
      handler: list,
    });

    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          payload: Joi.object({
            title: Joi.string().required(),
            type: Joi.string().required().valid(...QUESTIONNAIRE_TYPES),
          }),
        },
        auth: { scope: ['questionnaires:edit'] },
      },
      handler: create,
    });
  },
};
