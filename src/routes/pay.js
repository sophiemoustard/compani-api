'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const {
  getHoursBalanceDetails,
  exportDsnInfo,
} = require('../controllers/payController');
const { monthValidation, objectIdOrArray } = require('./validations/utils');
const { authorizeGetDetails } = require('./preHandlers/pay');
const { IDENTIFICATION, CONTRACT_VERSION, ABSENCE, CONTRACT_END, PAY } = require('../helpers/constants');

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

    server.route({
      method: 'GET',
      path: '/export/{type}',
      options: {
        auth: { scope: ['pay:edit'] },
        validate: {
          params: Joi.object({
            type: Joi.string().valid(IDENTIFICATION, CONTRACT_VERSION, ABSENCE, CONTRACT_END, PAY),
          }),
          query: Joi.object({
            startDate: Joi.date().required(),
            endDate: Joi.date().required().greater(Joi.ref('startDate')),
          }),
        },
      },
      handler: exportDsnInfo,
    });
  },
};
