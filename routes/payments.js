'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  list,
  create,
} = require('../controllers/paymentController');
const { REFUND, PAYMENT, PAYMENT_TYPES } = require('../helpers/constants');

exports.plugin = {
  name: 'routes-payments',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { strategy: 'jwt' },
        validate: {
          query: {
            endDate: Joi.date(),
            startDate: Joi.date(),
            customer: Joi.objectId(),
          },
        },
      },
      handler: list,
    });

    server.route({
      method: 'POST',
      path: '/',
      options: {
        auth: { strategy: 'jwt' },
        validate: {
          payload: {
            date: Joi.date().required(),
            customer: Joi.objectId().required(),
            client: Joi.objectId(),
            netInclTaxes: Joi.number().required(),
            nature: Joi.string().valid(REFUND, PAYMENT).required(),
            type: Joi.string().valid(PAYMENT_TYPES).required(),
          },
        },
      },
      handler: create,
    });
  },
};
