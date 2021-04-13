'use-strict';

const Joi = require('joi');
const { QUESTIONNAIRE_TYPES } = require('../models/Questionnaire');
const { list, create, getById, update, addCard, removeCard } = require('../controllers/questionnaireController');
const {
  authorizeQuestionnaireGet,
  authorizeQuestionnaireCreation,
  authorizeQuestionnaireEdit,
  authorizeCardDeletion,
} = require('./preHandlers/questionnaires');
const { CARD_TEMPLATES } = require('../models/Card');

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
      method: 'POST',
      path: '/{_id}/cards',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object({ template: Joi.string().required().valid(...CARD_TEMPLATES) }),

        },
        auth: { scope: ['questionnaires:edit'] },
        pre: [{ method: authorizeQuestionnaireEdit }],
      },
      handler: addCard,
    });

    server.route({
      method: 'DELETE',
      path: '/cards/{cardId}',
      options: {
        validate: { params: Joi.object({ cardId: Joi.objectId().required() }) },
        auth: { scope: ['questionnaires:edit'] },
        pre: [{ method: authorizeCardDeletion }],
      },
      handler: removeCard,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.alternatives().try(
            Joi.object({ title: Joi.string().required() }),
            Joi.object({ cards: Joi.array().items(Joi.objectId()).required() })
          ),
        },
        auth: { scope: ['questionnaires:edit'] },
        pre: [{ method: authorizeQuestionnaireEdit }],
      },
      handler: update,
    });
  },
};
