'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const {
  list,
  create,
  update,
  addBillingPurchase,
  updateBillingPurchase,
} = require('../controllers/courseBillController');
const {
  authorizeCourseBillCreation,
  authorizeCourseBillGet,
  authorizeCourseBillUpdate,
  authorizeCourseBillingPurchaseAddition,
  authorizeCourseBillingPurchaseUpdate,
} = require('./preHandlers/courseBills');
const { requiredDateToISOString } = require('./validations/utils');

exports.plugin = {
  name: 'routes-course-bills',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['config:vendor'] },
        validate: { query: Joi.object({ course: Joi.objectId().required() }) },
        pre: [{ method: authorizeCourseBillGet }],
      },
      handler: list,
    });

    server.route({
      method: 'POST',
      path: '/',
      options: {
        auth: { scope: ['config:vendor'] },
        validate: {
          payload: Joi.object({
            course: Joi.objectId().required(),
            mainFee: Joi.object({
              price: Joi.number().positive().required(),
              count: Joi.number().positive().integer().required(),
            }).required(),
            company: Joi.objectId().required(),
            courseFundingOrganisation: Joi.objectId(),
          }),
        },
        pre: [{ method: authorizeCourseBillCreation }],
      },
      handler: create,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        auth: { scope: ['config:vendor'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.alternatives().try(
            Joi.object({
              courseFundingOrganisation: Joi.objectId().allow(''),
              mainFee: Joi.object({
                price: Joi.number().positive(),
                count: Joi.number().positive().integer(),
                description: Joi.string().allow(''),
              }),
            }),
            Joi.object({ billedAt: requiredDateToISOString })
          ),
        },
        pre: [{ method: authorizeCourseBillUpdate }],
      },
      handler: update,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/billingpurchases',
      options: {
        auth: { scope: ['config:vendor'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object({
            billingItem: Joi.objectId().required(),
            price: Joi.number().positive().required(),
            count: Joi.number().positive().integer().required(),
            description: Joi.string().allow(''),
          }),
        },
        pre: [{ method: authorizeCourseBillingPurchaseAddition }],
      },
      handler: addBillingPurchase,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}/billingpurchases/{billingPurchaseId}',
      options: {
        auth: { scope: ['config:vendor'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required(), billingPurchaseId: Joi.objectId().required() }),
          payload: Joi.object({
            price: Joi.number().positive().required(),
            count: Joi.number().positive().integer().required(),
            description: Joi.string().allow(''),
          }),
        },
        pre: [{ method: authorizeCourseBillingPurchaseUpdate }],
      },
      handler: updateBillingPurchase,
    });
  },
};
