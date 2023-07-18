'use-strict';

const Joi = require('joi');
const { get, update } = require('../controllers/vendorCompanyController');
const { authorizeVendorCompanyUpdate } = require('./preHandlers/vendorCompanies');
const { addressValidation, siretValidation } = require('./validations/utils');

exports.plugin = {
  name: 'routes-vendor-companies',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['vendorcompanies:read'] },
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
            billingRepresentative: Joi.objectId(),
          }),
        },
        auth: { scope: ['vendorcompanies:edit'] },
        pre: [{ method: authorizeVendorCompanyUpdate }],
      },
      handler: update,
    });
  },
};
