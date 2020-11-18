'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { payValidation } = require('./validations/pay');
const {
  draftPayList,
  createList,
  getHoursBalanceDetails,
  getHoursToWork,
  exportDsnInfo,
} = require('../controllers/payController');
const { monthValidation, objectIdOrArray } = require('./validations/utils');
const { authorizePayCreation, authorizeGetDetails, authorizeGetHoursToWork } = require('./preHandlers/pay');
const { CONTRACT } = require('../helpers/constants');

exports.plugin = {
  name: 'routes-pay',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/draft',
      options: {
        auth: { scope: ['pay:edit'] },
        validate: {
          query: Joi.object({
            endDate: Joi.date(),
            startDate: Joi.date(),
          }),
        },
      },
      handler: draftPayList,
    });

    server.route({
      method: 'POST',
      path: '/',
      options: {
        auth: { scope: ['pay:edit'] },
        validate: {
          payload: Joi.array().items(Joi.object({
            ...payValidation,
          })),
        },
        pre: [{ method: authorizePayCreation }],
      },
      handler: createList,
    });

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
      path: '/hours-to-work',
      options: {
        auth: { scope: ['pay:read'] },
        validate: {
          query: Joi.object({
            sector: objectIdOrArray.required(),
            month: monthValidation.required(),
          }),
        },
        pre: [{ method: authorizeGetHoursToWork }],
      },
      handler: getHoursToWork,
    });

    server.route({
      method: 'GET',
      path: '/export/{type}',
      options: {
        auth: { scope: ['pay:edit'] },
        validate: {
          params: Joi.object({ type: Joi.string().valid(CONTRACT) }),
          query: Joi.object({ endDate: Joi.date().required() }),
        },
      },
      handler: exportDsnInfo,
    });
  },
};
