'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const { create, createList, update, remove } = require('../controllers/paymentController');
const {
  authorizePaymentUpdate,
  authorizePaymentsListCreation,
  authorizePaymentCreation,
  authorizePaymentDeletion,
} = require('./preHandlers/payments');
const { PAYMENT_NATURES, PAYMENT_TYPES } = require('../models/Payment');

exports.plugin = {
  name: 'routes-payments',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        auth: { scope: ['payments:edit'] },
        validate: {
          payload: Joi.object({
            date: Joi.date().required(),
            customer: Joi.objectId().required(),
            thirdPartyPayer: Joi.objectId(),
            netInclTaxes: Joi.number().required(),
            nature: Joi.string().valid(...PAYMENT_NATURES).required(),
            type: Joi.string().valid(...PAYMENT_TYPES).required(),
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
        auth: { scope: ['payments:edit'] },
        validate: {
          payload: Joi.array().items(Joi.object().keys({
            date: Joi.date().required(),
            customer: Joi.objectId().required(),
            customerInfo: Joi.object(),
            netInclTaxes: Joi.number().required(),
            nature: Joi.string().valid(...PAYMENT_NATURES).required(),
            type: Joi.string().valid(...PAYMENT_TYPES).required(),
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
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object({
            date: Joi.date().required(),
            netInclTaxes: Joi.number().required(),
            type: Joi.string().valid(...PAYMENT_TYPES).required(),
            nature: Joi.string(),
          }),
        },
        pre: [{ method: authorizePaymentUpdate, assign: 'payment' }],
      },
      handler: update,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}',
      options: {
        auth: { scope: ['payments:edit'] },
        validate: { params: Joi.object({ _id: Joi.objectId().required() }) },
        pre: [{ method: authorizePaymentUpdate, assign: 'payment' }, { method: authorizePaymentDeletion }],
      },
      handler: remove,
    });
  },
};
