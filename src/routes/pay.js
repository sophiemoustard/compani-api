'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { getHoursBalanceDetails } = require('../controllers/payController');
const { monthValidation, objectIdOrArray } = require('./validations/utils');
const { authorizeGetDetails } = require('./preHandlers/pay');

exports.plugin = {
  name: 'routes-pay',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/hours-balance-details',
      options: {
        auth: { scope: ['events:read'] },
        validate: {
          query: Joi.object().keys({
            sector: objectIdOrArray,
            auxiliary: Joi.objectId(),
            month: monthValidation.required(),
          }).xor('sector', 'auxiliary'),
        },
        pre: [{ method: authorizeGetDetails }],
      },
      handler: getHoursBalanceDetails,
    });
  },
};
