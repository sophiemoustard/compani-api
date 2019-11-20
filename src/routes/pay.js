'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { payValidation } = require('../../validations/pay');
const {
  draftPayList,
  createList,
  getHoursBalanceDetails,
} = require('../controllers/payController');

exports.plugin = {
  name: 'routes-pay',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/draft',
      options: {
        auth: { scope: ['pay:edit'] },
        validate: {
          query: {
            endDate: Joi.date(),
            startDate: Joi.date(),
          },
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
      },
      handler: createList,
    });

    server.route({
      method: 'GET',
      path: '/hours-balance-details',
      options: {
        auth: { scope: ['pay:edit', 'user-{query.auxiliary}'] },
        validate: {
          query: {
            auxiliary: Joi.objectId().required(),
            month: Joi.string().regex(/^([0]{1}[1-9]{1}|[1]{1}[0-2]{1})-[2]{1}[0]{1}[0-9]{2}$/).required(),
          },
        },
      },
      handler: getHoursBalanceDetails,
    });
  },
};
