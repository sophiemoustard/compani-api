'use-strict';

const Joi = require('joi');
const { authorizeHoldingCreation, authorizeHoldingUpdate } = require('./preHandlers/holdings');
const { create, list, update } = require('../controllers/holdingController');

exports.plugin = {
  name: 'routes-holdings',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        auth: { scope: ['holdings:edit'] },
        validate: {
          payload: Joi.object({
            name: Joi.string().required(),
            address: Joi.string(),
          }),
        },
        pre: [{ method: authorizeHoldingCreation }],
      },
      handler: create,
    });

    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['holdings:read'] },
      },
      handler: list,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        auth: { scope: ['holdings:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object().keys({
            company: Joi.objectId(),
          }).required(),
        },
        pre: [{ method: authorizeHoldingUpdate }],
      },
      handler: update,
    });
  },
};
