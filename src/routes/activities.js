'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { getById, update, addCard } = require('../controllers/activityController');
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
          payload: Joi.object({ name: Joi.string().required() }),
        },
        auth: { scope: ['programs:edit'] },
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
      },
      handler: addCard,
    });
  },
};
