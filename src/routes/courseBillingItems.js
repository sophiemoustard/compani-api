'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { list, create } = require('../controllers/courseBillingItemController');
const {
  authorizeCourseBillingItemCreation,
} = require('./preHandlers/courseBillingItems');

exports.plugin = {
  name: 'routes-course-billing-items',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: { auth: { scope: ['config:vendor'] } },
      handler: list,
    });

    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          payload: Joi.object({
            name: Joi.string().required(),
          }),
        },
        auth: { scope: ['config:vendor'] },
        pre: [{ method: authorizeCourseBillingItemCreation }],
      },
      handler: create,
    });
  },
};
