'use-strict';

const Joi = require('joi');
const { addressValidation } = require('./validations/utils');
const { authorizeHoldingCreation } = require('./preHandlers/holdings');
const { create, list } = require('../controllers/holdingController');

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
            address: Joi.alternatives().try(addressValidation, {}),
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
  },
};
