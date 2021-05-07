'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { authorizeCardAdd, authorizeActivityUpdate, authorizeCardDeletion } = require('./preHandlers/activities');
const { getById, update, addCard, removeCard } = require('../controllers/activityController');
const { CARD_TEMPLATES } = require('../models/Card');

exports.plugin = {
  name: 'routes-activities',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/{_id}',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        auth: { mode: 'required' },
      },
      handler: getById,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object({
            name: Joi.string(),
            type: Joi.string(),
            cards: Joi.array().items(Joi.objectId()),
          }).min(1),
        },
        auth: { scope: ['programs:edit'] },
        pre: [{ method: authorizeActivityUpdate }],
      },
      handler: update,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/cards',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object({ template: Joi.string().required().valid(...CARD_TEMPLATES) }),
        },
        auth: { scope: ['programs:edit'] },
        pre: [{ method: authorizeCardAdd }],
      },
      handler: addCard,
    });

    server.route({
      method: 'DELETE',
      path: '/cards/{cardId}',
      options: {
        validate: { params: Joi.object({ cardId: Joi.objectId().required() }) },
        auth: { scope: ['programs:edit'] },
        pre: [{ method: authorizeCardDeletion }],
      },
      handler: removeCard,
    });
  },
};
