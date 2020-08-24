'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { update, uploadMedia } = require('../controllers/cardController');
const { formDataPayload } = require('./validations/utils');
const { authorizeCardUpdate } = require('./preHandlers/cards');

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
            backText: Joi.string(),
            media: Joi.object().keys({
              link: Joi.string().allow(null),
              publicId: Joi.string().allow(null),
            }),
            answers: Joi.array().items(Joi.object({ label: Joi.string().required() })).min(1).max(6),
            question: Joi.string(),
            orderedAnswers: Joi.array().items(Joi.string()).min(1).max(3),
            explanation: Joi.string(),
          }),
        },
        auth: { scope: ['programs:edit'] },
        pre: [{ method: authorizeCardUpdate }],
      },
      handler: update,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/cloudinary/upload',
      handler: uploadMedia,
      options: {
        payload: formDataPayload,
        validate: {
          payload: Joi.object({
            fileName: Joi.string().required(),
            file: Joi.any().required(),
            media: Joi.object().keys({
              link: Joi.string().allow(null),
              publicId: Joi.string().allow(null),
            }),
          }),
          params: Joi.object({
            _id: Joi.objectId().required(),
          }),
        },
        auth: { scope: ['programs:edit'] },
      },
    });
  },
};
