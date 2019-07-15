'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  list,
  create,
  createList,
  update,
} = require('../controllers/paymentController');
const { PAYMENT_TYPES } = require('../helpers/constants');
const { PAYMENT_NATURES } = require('../models/Payment');

exports.plugin = {
  name: 'routes-payments',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
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
      },
      handler: create,
    });

    server.route({
      method: 'POST',
      path: '/createlist',
      options: {
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
          })),
        },
      },
      handler: createList,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        validate: {
          params: { _id: Joi.objectId() },
          payload: {
            date: Joi.date().required(),
            netInclTaxes: Joi.number().required(),
            type: Joi.string().valid(PAYMENT_TYPES).required(),
            nature: Joi.string(),
          },
        },
      },
      handler: update,
    });
  },
};
