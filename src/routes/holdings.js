'use-strict';

const Joi = require('joi');
const { addressValidation } = require('./validations/utils');
const { authorizeHoldingCreation } = require('./preHandlers/holdings');
const { create } = require('../controllers/holdingController');

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
            address: addressValidation,
          }),
        },
        pre: [{ method: authorizeHoldingCreation }],
      },
      handler: create,
    });
  },
};
