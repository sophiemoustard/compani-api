'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { list, create, update, addBillingItem } = require('../controllers/courseBillController');
const {
  authorizeCourseBillCreation,
  authorizeCourseBillGet,
  authorizeCourseBillUpdate,
  authorizeCourseBillingItemAddition,
} = require('./preHandlers/courseBills');

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
          payload: Joi.object({
            courseFundingOrganisation: Joi.objectId().allow(''),
            mainFee: Joi.object({
              price: Joi.number().positive(),
              count: Joi.number().positive().integer(),
              description: Joi.string().allow(''),
            }),
          }),
        },
        pre: [{ method: authorizeCourseBillUpdate }],
      },
      handler: update,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/billing-item',
      options: {
        auth: { scope: ['config:vendor'] },
        validate: {
          payload: Joi.object({
            billingItem: Joi.objectId().required(),
            price: Joi.number().positive().required(),
            count: Joi.number().positive().integer().required(),
            description: Joi.string().allow(''),
          }),
        },
        pre: [{ method: authorizeCourseBillingItemAddition }],
      },
      handler: addBillingItem,
    });
  },
};
