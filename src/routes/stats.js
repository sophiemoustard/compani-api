'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  getCustomerFollowUp,
  getCustomerFundingsMonitoring,
  getPaidInterventionStats,
  getCustomersAndDurationBySector,
  getAllCustomersFundingsMonitoring,
  getIntenalAndBilledHoursBySector,
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
      path: '/all-customers-fundings-monitoring',
      options: {
        auth: { scope: ['customers:read'] },
      },
      handler: getAllCustomersFundingsMonitoring,
    });

    server.route({
      method: 'GET',
      path: '/paid-intervention-stats',
      options: {
        auth: { scope: ['events:read'] },
        validate: {
          query: Joi.object().keys({
            sector: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())),
            auxiliary: Joi.objectId(),
            month: Joi.string().regex(/^([0]{1}[1-9]{1}|[1]{1}[0-2]{1})-[2]{1}[0]{1}[0-9]{2}$/).required(),
          }).xor('sector', 'auxiliary'),
        },
        pre: [{ method: authorizeGetStats }],
      },
      handler: getPaidInterventionStats,
    });

    server.route({
      method: 'GET',
      path: '/customer-duration/sector',
      options: {
        auth: { scope: ['events:read'] },
        validate: {
          query: Joi.object().keys({
            sector: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).required(),
            month: Joi.string().regex(/^([0]{1}[1-9]{1}|[1]{1}[0-2]{1})-[2]{1}[0]{1}[0-9]{2}$/).required(),
          }),
        },
        pre: [{ method: authorizeGetStats }],
      },
      handler: getCustomersAndDurationBySector,
    });

    server.route({
      method: 'GET',
      path: '/internal-billed-hours',
      options: {
        auth: { scope: ['events:read'] },
        validate: {
          query: Joi.object().keys({
            sector: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).required(),
            month: Joi.string().regex(/^([0]{1}[1-9]{1}|[1]{1}[0-2]{1})-[2]{1}[0]{1}[0-9]{2}$/).required(),
          }),
        },
        pre: [{ method: authorizeGetStats }],
      },
      handler: getIntenalAndBilledHoursBySector,
    });
  },
};
