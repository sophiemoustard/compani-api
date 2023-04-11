'use-strict';

const Joi = require('joi');
const { get, update } = require('../controllers/vendorCompanyController');
const { addressValidation, siretValidation } = require('./validations/utils');

exports.plugin = {
  name: 'routes-vendor-companies',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['config:vendor'] },
      },
      handler: get,
    });

    server.route({
      method: 'PUT',
      path: '/',
      options: {
        validate: {
          payload: Joi.object({
            name: Joi.string(),
            address: addressValidation,
            siret: siretValidation,
            activityDeclarationNumber: Joi.string(),
          }),
        },
        auth: { scope: ['config:vendor'] },
      },
      handler: update,
    });
  },
};
