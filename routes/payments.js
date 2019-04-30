'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  list,
  create,
  createList,
  update
} = require('../controllers/paymentController');
const { REFUND, PAYMENT, WITHDRAWAL, PAYMENT_TYPES } = require('../helpers/constants');

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
            rum: Joi.string().when('type', { is: WITHDRAWAL, then: Joi.required() }),
          },
        },
      },
      handler: create,
    });

    server.route({
      method: 'POST',
      path: '/createlist',
      options: {
        auth: { strategy: 'jwt' },
        validate: {
          payload: Joi.array().items(Joi.object().keys({
            date: Joi.date().required(),
            customer: Joi.objectId().required(),
            customerInfo: Joi.object(),
            client: Joi.objectId(),
            netInclTaxes: Joi.number().required(),
            nature: Joi.string().valid(REFUND, PAYMENT).required(),
            type: Joi.string().valid(PAYMENT_TYPES).required(),
            rum: Joi.string().required(),
          })),
        },
      },
      handler: createList,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        auth: { strategy: 'jwt' },
        validate: {
          params: { _id: Joi.objectId() },
          payload: {
            date: Joi.date().required(),
            netInclTaxes: Joi.number().required(),
            type: Joi.string().valid(PAYMENT_TYPES).required(),
          },
        },
      },
      handler: update,
    });
  },
};
