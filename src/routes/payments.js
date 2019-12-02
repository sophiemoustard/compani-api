'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  list,
  create,
  createList,
  update,
} = require('../controllers/paymentController');
const { getPayment, authorizePaymentUpdate, authorizePaymentsListCreation, authorizePaymentCreation } = require('./preHandlers/payments');
const { PAYMENT_NATURES, PAYMENT_TYPES } = require('../models/Payment');

exports.plugin = {
  name: 'routes-payments',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['payments:edit', 'customer-{query.customer}'] },
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
        auth: { scope: ['payments:edit'] },
        validate: {
          payload: Joi.object({
            date: Joi.date().required(),
            customer: Joi.objectId().required(),
            client: Joi.objectId(),
            netInclTaxes: Joi.number().required(),
            nature: Joi.string().valid(PAYMENT_NATURES).required(),
            type: Joi.string().valid(PAYMENT_TYPES).required(),
          }),
        },
        pre: [{ method: authorizePaymentCreation }],
      },
      handler: create,
    });

    server.route({
      method: 'POST',
      path: '/createlist',
      options: {
        auth: { scope: ['payments:list:create'] },
        validate: {
          payload: Joi.array().items(Joi.object().keys({
            date: Joi.date().required(),
            customer: Joi.objectId().required(),
            customerInfo: Joi.object(),
            client: Joi.objectId(),
            netInclTaxes: Joi.number().required(),
            nature: Joi.string().valid(PAYMENT_NATURES).required(),
            type: Joi.string().valid(PAYMENT_TYPES).required(),
            rum: Joi.string().required(),
          })).min(1).required(),
        },
        pre: [{ method: authorizePaymentsListCreation }],
      },
      handler: createList,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        auth: { scope: ['payments:edit'] },
        validate: {
          params: { _id: Joi.objectId() },
          payload: {
            date: Joi.date().required(),
            netInclTaxes: Joi.number().required(),
            type: Joi.string().valid(PAYMENT_TYPES).required(),
            nature: Joi.string(),
          },
        },
        pre: [
          { method: getPayment, assign: 'payment' },
          { method: authorizePaymentUpdate },
        ],
      },
      handler: update,
    });
  },
};
