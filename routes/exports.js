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
} = require('../helpers/constants');

exports.plugin = {
  name: 'routes-exports',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/{type}/data',
      options: {
        auth: { strategy: 'jwt' },
        validate: {
          params: {
            type: Joi.string().required().valid(SERVICE, AUXILIARY, HELPER, CUSTOMER, FUNDING, SUBSCRIPTION),
          },
        },
      },
      handler: exportData,
    });

    server.route({
      method: 'GET',
      path: '/{type}/history',
      options: {
        auth: { strategy: 'jwt' },
        validate: {
          params: {
            type: Joi.string().required().valid(WORKING_EVENT, BILL),
          },
          query: {
            startDate: Joi.date().required(),
            endDate: Joi.date().required(),
          },
        },
      },
      handler: exportHistory,
    });
  }
};
