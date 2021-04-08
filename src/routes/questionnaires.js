'use-strict';

const Joi = require('joi');
const { QUESTIONNAIRE_TYPES } = require('../models/Questionnaire');
const { list, create, getById, update } = require('../controllers/questionnaireController');
const {
  authorizeQuestionnaireGet,
  authorizeQuestionnaireCreation,
  authorizeQuestionnaireEdit,
} = require('./preHandlers/questionnaires');

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
      method: 'GET',
      path: '/{_id}',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        auth: { mode: 'required' },
        pre: [{ method: authorizeQuestionnaireGet }],
      },
      handler: getById,
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
        pre: [{ method: authorizeQuestionnaireCreation }],
      },
      handler: create,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object({ title: Joi.string(), cards: Joi.array().items(Joi.objectId()) }).min(1),
        },
        auth: { scope: ['questionnaires:edit'] },
        pre: [{ method: authorizeQuestionnaireEdit }],
      },
      handler: update,
    });
  },
};
