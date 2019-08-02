'use-strict';

const Joi = require('joi');
const { payValidation } = require('../validations/pay');
const { draftFinalPayList, createList } = require('../controllers/finalPayController');

exports.plugin = {
  name: 'routes-final-pay',
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
      },
      handler: createList,
    });
  },
};
