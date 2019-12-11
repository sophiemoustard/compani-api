'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  getCustomerFollowUp,
  getCustomerFundingsMonitoring,
  getCustomerAndDurationMonitoring,
} = require('../controllers/statController');
const { authorizeGetStats } = require('./preHandlers/stats');

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
        pre: [{ method: authorizeGetStats }],
      },
      handler: getCustomerFollowUp,
    });

    server.route({
      method: 'GET',
      path: '/customer-fundings-monitoring',
      options: {
        auth: { scope: ['customers:read'] },
        validate: {
          query: {
            customer: Joi.objectId().required(),
          },
        },
        pre: [{ method: authorizeGetStats }],
      },
      handler: getCustomerFundingsMonitoring,
    });

    server.route({
      method: 'GET',
      path: '/customer-duration-monitoring',
      options: {
        auth: { scope: ['events:read'] },
        validate: {
          query: {
            sector: [Joi.string().required(), Joi.array().items(Joi.string()).required()],
            month: Joi.string().required(),
          },
        },
        // pre: [{ method: authorizeGetStats }],
      },
      handler: getCustomerAndDurationMonitoring,
    });
  },
};
