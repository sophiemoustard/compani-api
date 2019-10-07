'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { payValidation } = require('../../validations/pay');
const {
  draftPayList,
  createList,
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
  },
};
