'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { objectIdOrArray, monthValidation } = require('./validations/utils');
const { authorizeDelivery } = require('./preHandlers/teletransmission');
const { generateDeliveryXml } = require('../controllers/teletransmissionController');

exports.plugin = {
  name: 'routes-teletransmission',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/delivery',
      options: {
        auth: { scope: ['bills:edit'] },
        validate: {
          query: Joi.object({
            thirdPartyPayers: objectIdOrArray.required(),
            month: monthValidation.required(),
            onlyPastEvents: Joi.boolean(),
          }),
        },
        pre: [{ method: authorizeDelivery }],
      },
      handler: generateDeliveryXml,
    });
  },
};
