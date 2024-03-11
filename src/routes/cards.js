'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const {
  update,
  uploadMedia,
  updateAnswer,
  addAnswer,
  deleteAnswer,
  deleteMedia,
} = require('../controllers/cardController');
const { formDataPayload } = require('./validations/utils');
const {
  authorizeCardUpdate,
  authorizeCardAnswerUpdate,
  authorizeCardAnswerCreation,
  authorizeCardAnswerDeletion,
  getCardMediaPublicId,
} = require('./preHandlers/cards');
const {
  SURVEY_LABEL_MAX_LENGTH,
  QC_ANSWER_MAX_LENGTH,
  QUESTION_MAX_LENGTH,
  FLASHCARD_TEXT_MAX_LENGTH,
} = require('../helpers/constants');

exports.plugin = {
  name: 'routes-cards',
  register: async (server) => {
    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object({
            title: Joi.string(),
            text: Joi.string(),
            backText: Joi.string().max(FLASHCARD_TEXT_MAX_LENGTH),
            media: Joi.object().keys({
              link: Joi.string().allow(null),
              publicId: Joi.string().allow(null),
              type: Joi.string(),
            }),
            gappedText: Joi.string(),
            question: Joi.string().max(QUESTION_MAX_LENGTH),
            qcuGoodAnswer: Joi.string().max(QC_ANSWER_MAX_LENGTH),
            isQuestionAnswerMultipleChoiced: Joi.boolean(),
            explanation: Joi.string(),
            labels: Joi.object().keys({
              1: Joi.string().allow('', null).max(SURVEY_LABEL_MAX_LENGTH),
              5: Joi.string().allow('', null).max(SURVEY_LABEL_MAX_LENGTH),
            }),
            canSwitchAnswers: Joi.boolean(),
            isMandatory: Joi.boolean(),
          }),
        },
        auth: { scope: ['programs:edit'] },
        pre: [{ method: authorizeCardUpdate }],
      },
      handler: update,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/answers',
      options: {
        validate: { params: Joi.object({ _id: Joi.objectId().required() }) },
        auth: { scope: ['programs:edit'] },
        pre: [{ method: authorizeCardAnswerCreation, assign: 'card' }],
      },
      handler: addAnswer,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}/answers/{answerId}',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required(), answerId: Joi.objectId().required() }),
          payload: Joi.object({ text: Joi.string(), correct: Joi.boolean() }).min(1),
        },
        auth: { scope: ['programs:edit'] },
        pre: [{ method: authorizeCardAnswerUpdate, assign: 'card' }],
      },
      handler: updateAnswer,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}/answers/{answerId}',
      options: {
        validate: { params: Joi.object({ _id: Joi.objectId().required(), answerId: Joi.objectId().required() }) },
        auth: { scope: ['programs:edit'] },
        pre: [{ method: authorizeCardAnswerDeletion, assign: 'card' }],
      },
      handler: deleteAnswer,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/upload',
      handler: uploadMedia,
      options: {
        payload: formDataPayload(25 * 1000 * 1000),
        validate: {
          payload: Joi.object({
            fileName: Joi.string().required(),
            file: Joi.any().required(),
            media: Joi.object().keys({ link: Joi.string().allow(null), publicId: Joi.string().allow(null) }),
          }),
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        auth: { scope: ['programs:edit'] },
      },
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}/upload',
      handler: deleteMedia,
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        auth: { scope: ['programs:edit'] },
        pre: [{ method: getCardMediaPublicId, assign: 'publicId' }],
      },
    });
  },
};
