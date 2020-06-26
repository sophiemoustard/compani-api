'use-strict';

const Joi = require('@hapi/joi');
const { seedDb } = require('../controllers/endToEndController');
const { authorizeDatabaseSeed } = require('./preHandlers/endToEnd');
const { PLANNING, AUTHENTICATION, BILLING, AGENDA } = require('../helpers/constants');

exports.plugin = {
  name: 'routes-e2e',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/seed/{type}',
      options: {
        auth: false,
        validate: {
          params: Joi.object({
            type: Joi.string().required().valid(PLANNING, AUTHENTICATION, BILLING, AGENDA),
          }),
        },
        pre: [{ method: authorizeDatabaseSeed }],
      },
      handler: seedDb,
    });
  },
};
