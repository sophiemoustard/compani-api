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
  SECTOR,
  RUP,
  REFERENT,
  EXPORT_TYPES,
} = require('../helpers/constants');
const { authorizeExport } = require('./preHandlers/exports');

exports.plugin = {
  name: 'routes-exports',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/{type}/data',
      options: {
        validate: {
          params: Joi.object({
            type: Joi.string()
              .required()
              .valid(SERVICE, AUXILIARY, HELPER, CUSTOMER, FUNDING, SUBSCRIPTION, SECTOR, RUP, REFERENT),
          }),
        },
        pre: [{ method: authorizeExport }],
        auth: { scope: ['exports:read'] },
      },
      handler: exportData,
    });

    server.route({
      method: 'GET',
      path: '/{type}/history',
      options: {
        validate: {
          params: Joi.object({
            type: Joi.string().required().valid(...EXPORT_TYPES),
          }),
          query: Joi.object({ startDate: Joi.date().required(), endDate: Joi.date().required() }),
        },
        pre: [{ method: authorizeExport }],
        auth: { scope: ['exports:read'] },
      },
      handler: exportHistory,
    });
  },
};
