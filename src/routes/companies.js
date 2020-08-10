'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  update,
  uploadFile,
  create,
  getFirstIntervention,
  list,
  show,
} = require('../controllers/companyController');
const { TWO_WEEKS } = require('../helpers/constants');
const { COMPANY_BILLING_PERIODS, COMPANY_TYPES } = require('../models/Company');
const { authorizeCompanyUpdate, companyExists } = require('./preHandlers/companies');
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
            tradeName: Joi.string().max(11).allow('', null),
            address: addressValidation,
            subscriptions: Joi.object().keys({
              erp: Joi.boolean(),
            }).min(1),
            ics: Joi.string(),
            rcs: Joi.string(),
            rna: Joi.string(),
            iban: Joi.string(),
            bic: Joi.string(),
            billingAssistance: Joi.string().email().allow(''),
            legalRepresentative: Joi.object().keys({
              lastname: Joi.string(),
              firstname: Joi.string(),
              position: Joi.string(),
            }),
            apeCode: Joi.string().regex(/^\d{3,4}[A-Z]$/),
            rhConfig: Joi.object().keys({
              grossHourlyRate: Joi.number(),
              feeAmount: Joi.number(),
              amountPerKm: Joi.number(),
              transportSubs: [Joi.array().items({
                department: Joi.string(),
                price: Joi.number(),
              }), Joi.object().keys({
                subId: Joi.objectId().required(),
                price: Joi.number(),
              })],
              templates: Joi.object().keys({
                contract: Joi.object().keys({
                  driveId: Joi.string().allow(null),
                  link: Joi.string().allow(null),
                }),
                contractVersion: Joi.object().keys({
                  driveId: Joi.string().allow(null),
                  link: Joi.string().allow(null),
                }),
              }),
            }),
            customersConfig: Joi.object().keys({
              billingPeriod: Joi.string().valid(...COMPANY_BILLING_PERIODS),
              templates: Joi.object().keys({
                debitMandate: Joi.object().keys({
                  driveId: Joi.string().allow(null),
                  link: Joi.string().allow(null),
                }),
                quote: Joi.object().keys({
                  driveId: Joi.string().allow(null),
                  link: Joi.string().allow(null),
                }),
              }),
            }),
          }),
        },
        pre: [
          { method: companyExists },
          { method: authorizeCompanyUpdate },
        ],
      },
      handler: update,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/gdrive/{driveId}/upload',
      handler: uploadFile,
      options: {
        auth: { scope: ['company-{params._id}'] },
        payload: {
          output: 'stream',
          parse: true,
          allow: 'multipart/form-data',
          maxBytes: 5242880,
        },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required(), driveId: Joi.string().required() }),
          payload: Joi.object({
            fileName: Joi.string().required(),
            type: Joi.string().required().valid(
              'contract',
              'contractVersion',
              'debitMandate',
              'quote'
            ),
            file: Joi.any().required(),
          }),
        },
        pre: [{ method: authorizeCompanyUpdate }],
      },
    });

    server.route({
      method: 'POST',
      path: '/',
      handler: create,
      options: {
        auth: { scope: ['companies:create'] },
        validate: {
          payload: Joi.object().keys({
            name: Joi.string().required(),
            tradeName: Joi.string().max(11),
            type: Joi.string().valid(...COMPANY_TYPES).required(),
            rcs: Joi.string(),
            rna: Joi.string(),
            ics: Joi.string(),
            iban: Joi.string(),
            bic: Joi.string(),
            billingAssistance: Joi.string().email(),
            apeCode: Joi.string().regex(/^\d{3,4}[A-Z]$/),
            rhConfig: Joi.object().keys({
              grossHourlyRate: Joi.number(),
              feeAmount: Joi.number(),
              amountPerKm: Joi.number(),
              transportSubs: Joi.array().items({
                department: Joi.string(),
                price: Joi.number(),
              }).min(1),
            }).min(1),
            customersConfig: Joi.object().keys({
              billingPeriod: Joi.string().valid(...COMPANY_BILLING_PERIODS).default(TWO_WEEKS),
            }).min(1),
          }),
        },
      },
    });

    server.route({
      method: 'GET',
      path: '/first-intervention',
      handler: getFirstIntervention,
      options: {
        auth: { scope: ['events:read'] },
      },
    });

    server.route({
      method: 'GET',
      path: '/',
      handler: list,
      options: {
        auth: { scope: ['companies:read'] },
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
      },
    });
  },
};
