'use-strict';

const Joi = require('joi');
const { payValidation } = require('./validations/pay');
const { draftFinalPayList, createList } = require('../controllers/finalPayController');
const { authorizeFinalPayCreation } = require('./preHandlers/finalPay');

exports.plugin = {
  name: 'routes-final-pay',
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
      handler: draftFinalPayList,
    });

    server.route({
      method: 'POST',
      path: '/',
      options: {
        auth: { scope: ['pay:edit'] },
        validate: {
          payload: Joi.array().items(Joi.object({
            ...payValidation,
            endNotificationDate: Joi.date().required(),
            endReason: Joi.string().required(),
            compensation: Joi.number().required(),
          })),
        },
        pre: [{ method: authorizeFinalPayCreation }],
      },
      handler: createList,
    });
  },
};
