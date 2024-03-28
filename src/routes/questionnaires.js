'use-strict';

const Joi = require('joi');
const { QUESTIONNAIRE_TYPES } = require('../models/Questionnaire');
const {
  list,
  create,
  getById,
  update,
  addCard,
  removeCard,
  getUserQuestionnaires,
  getFollowUp,
  getQRCode,
} = require('../controllers/questionnaireController');
const {
  authorizeQuestionnaireGet,
  authorizeQuestionnaireCreation,
  authorizeQuestionnaireEdit,
  authorizeCardDeletion,
  authorizeUserQuestionnairesGet,
  authorizeGetFollowUp,
  authorizeQuestionnaireQRCodeGet,
  authorizeGetList,
} = require('./preHandlers/questionnaires');
const {
  PUBLISHED,
  TRANSITION,
  TITLE_TEXT_MEDIA,
  TITLE_TEXT,
  TEXT_MEDIA,
  OPEN_QUESTION,
  SURVEY,
  QUESTION_ANSWER,
  SELF_POSITIONNING,
} = require('../helpers/constants');

const QUESTIONNAIRE_CARD_TEMPLATES = [
  TRANSITION,
  TITLE_TEXT_MEDIA,
  TITLE_TEXT,
  TEXT_MEDIA,
  OPEN_QUESTION,
  SURVEY,
  QUESTION_ANSWER,
];

exports.plugin = {
  name: 'routes-questionnaires',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        validate: {
          query: Joi.object({
            course: Joi.objectId(),
            program: Joi.objectId(),
          }).oxor('course', 'program'),
        },
        auth: { scope: ['questionnaires:read'] },
        pre: [{ method: authorizeGetList }],
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
        auth: { mode: 'optional' },
        pre: [{ method: authorizeQuestionnaireGet }],
      },
      handler: getById,
    });

    server.route({
      method: 'GET',
      path: '/user',
      options: {
        validate: {
          query: Joi.object({ course: Joi.objectId().required() }),
        },
        auth: { mode: 'required' },
        pre: [{ method: authorizeUserQuestionnairesGet }],
      },
      handler: getUserQuestionnaires,
    });

    server.route({
      method: 'GET',
      path: '/{_id}/follow-up',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          query: Joi.object({ course: Joi.objectId() }),
        },
        auth: { scope: ['questionnaires:read'] },
        pre: [{ method: authorizeGetFollowUp }],
      },
      handler: getFollowUp,
    });

    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          payload: Joi.object({
            name: Joi.string().required(),
            type: Joi.string().required().valid(...QUESTIONNAIRE_TYPES),
            program: Joi.objectId()
              .when('type', { is: SELF_POSITIONNING, then: Joi.required(), otherwise: Joi.forbidden() }),
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
          payload: Joi.object({ template: Joi.string().required().valid(...QUESTIONNAIRE_CARD_TEMPLATES) }),
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
          payload: Joi.object({
            name: Joi.string(),
            cards: Joi.array().items(Joi.objectId()),
            status: Joi.string().valid(PUBLISHED),
          }),
        },
        auth: { scope: ['questionnaires:edit'] },
        pre: [{ method: authorizeQuestionnaireEdit }],
      },
      handler: update,
    });

    server.route({
      method: 'GET',
      path: '/{_id}/qrcode',
      options: {
        auth: { scope: ['questionnaires:read'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          query: Joi.object({ course: Joi.objectId().required() }),
        },
        pre: [{ method: authorizeQuestionnaireGet }, { method: authorizeQuestionnaireQRCodeGet }],
      },
      handler: getQRCode,
    });
  },
};
