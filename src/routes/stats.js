'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  getCustomerFollowUp,
  getCustomerFundingsMonitoring,
  getPaidInterventionStats,
  getIntenalAndBilledHoursBySector,
} = require('../controllers/statController');
const { monthValidation, objectIdOrArray } = require('./validations/utils');
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
          query: Joi.object({ customer: Joi.objectId().required() }),
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
          query: Joi.object({ customer: Joi.objectId().required() }),
        },
        pre: [{ method: authorizeGetStats }],
      },
      handler: getCustomerFundingsMonitoring,
    });

    server.route({
      method: 'GET',
      path: '/paid-intervention-stats',
      options: {
        auth: { scope: ['events:read'] },
        validate: {
          query: Joi.object().keys({
            sector: objectIdOrArray,
            auxiliary: Joi.objectId(),
            month: monthValidation.required(),
          }).xor('sector', 'auxiliary'),
        },
        pre: [{ method: authorizeGetStats }],
      },
      handler: getPaidInterventionStats,
    });

    server.route({
      method: 'GET',
      path: '/internal-billed-hours',
      options: {
        auth: { scope: ['events:read'] },
        validate: {
          query: Joi.object().keys({ sector: objectIdOrArray.required(), month: monthValidation.required() }),
        },
        pre: [{ method: authorizeGetStats }],
      },
      handler: getIntenalAndBilledHoursBySector,
    });
  },
};
