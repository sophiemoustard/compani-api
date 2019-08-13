'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const { exportData, exportHistory } = require('../controllers/exportController');
const {
  SERVICE,
  AUXILIARY,
  HELPER,
  CUSTOMER,
  FUNDING,
  SUBSCRIPTION,
  WORKING_EVENT,
  BILL,
  PAYMENT,
  ABSENCE,
  PAY,
  FINAL_PAY,
} = require('../helpers/constants');

exports.plugin = {
  name: 'routes-exports',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/{type}/data',
      options: {
        validate: {
          params: {
            type: Joi.string().required().valid(SERVICE, AUXILIARY, HELPER, CUSTOMER, FUNDING, SUBSCRIPTION),
          },
        },
        auth: { scope: ['exports:read'] },
      },
      handler: exportData,
    });

    server.route({
      method: 'GET',
      path: '/{type}/history',
      options: {
        validate: {
          params: {
            type: Joi.string().required().valid(WORKING_EVENT, BILL, PAYMENT, ABSENCE, PAY, FINAL_PAY),
          },
          query: {
            startDate: Joi.date().required(),
            endDate: Joi.date().required(),
          },
        },
        auth: { scope: ['exports:read'] },
      },
      handler: exportHistory,
    });
  },
};
