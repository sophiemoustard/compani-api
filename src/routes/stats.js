'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const { getCustomerFollowUp } = require('../controllers/statController');

exports.plugin = {
  name: 'routes-stats',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/customer-follow-up',
      options: {
        auth: { scope: ['customers:read'] },
        validate: {
          query: {
            customer: Joi.objectId().required(),
          },
        },
      },
      handler: getCustomerFollowUp,
    });
  },
};
