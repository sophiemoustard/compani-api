'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  update,
  create,
  list,
  show,
} = require('../controllers/companyController');
const {
  authorizeCompanyUpdate,
  authorizeCompanyCreation,
  doesCompanyExist,
  authorizeGetCompanies,
  authorizeGetCompany,
} = require('./preHandlers/companies');
const { addressValidation } = require('./validations/utils');

exports.plugin = {
  name: 'routes-companies',
  register: async (server) => {
    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        auth: { scope: ['companies:edit', 'company-{params._id}'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object().keys({
            name: Joi.string(),
            address: addressValidation,
            iban: Joi.string(),
            bic: Joi.string(),
            billingRepresentative: Joi.objectId(),
            salesRepresentative: Joi.objectId(),
          }),
        },
        pre: [
          { method: doesCompanyExist },
          { method: authorizeCompanyUpdate },
        ],
      },
      handler: update,
    });

    server.route({
      method: 'POST',
      path: '/',
      handler: create,
      options: {
        auth: { scope: ['companies:create'] },
        validate: {
          payload: Joi.object().keys({ name: Joi.string().required(), salesRepresentative: Joi.objectId() }),
        },
        pre: [{ method: authorizeCompanyCreation }],
      },
    });

    server.route({
      method: 'GET',
      path: '/',
      handler: list,
      options: {
        validate: {
          query: Joi.object({
            withoutHoldingCompanies: Joi.boolean(),
            holding: Joi.objectId(),
          }).oxor('withoutHoldingCompanies', 'holding'),
        },
        auth: { mode: 'optional' },
        pre: [{ method: authorizeGetCompanies }],
      },
    });

    server.route({
      method: 'GET',
      path: '/{_id}',
      handler: show,
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        auth: { scope: ['companies:read'] },
        pre: [{ method: doesCompanyExist }, { method: authorizeGetCompany }],
      },
    });
  },
};
