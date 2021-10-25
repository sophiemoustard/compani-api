'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { objectIdOrArray } = require('./validations/utils');

const { generateDeliveryXml } = require('../controllers/teletransmissionController');

exports.plugin = {
  name: 'routes-teletransmission',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      handler: generateDeliveryXml,
      options: {
        validate: {
          query: Joi.object({
            thirdPartyPayer: objectIdOrArray.required(),
            month: Joi.string().required(),
          }),
        },
      },
    });
  },
};
