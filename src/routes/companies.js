'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const { COMPANY_TYPES } = require('../models/Company');

const {
  update,
  uploadFile,
  addInternalHour,
  updateInternalHour,
  getInternalHours,
  removeInternalHour,
  create,
} = require('../controllers/companyController');
const { COMPANY_BILLING_PERIODS } = require('../models/Company');
const { authorizeCompanyUpdate, companyExists } = require('./preHandlers/companies');

exports.plugin = {
  name: 'routes-companies',
  register: async (server) => {
    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        auth: { scope: ['companies:edit'] },
        validate: {
          params: {
            _id: Joi.objectId().required(),
          },
          payload: Joi.object().keys({
            name: Joi.string(),
            tradeName: Joi.string().allow('', null),
            address: Joi.object().keys({
              street: Joi.string().required(),
              zipCode: Joi.string().required(),
              city: Joi.string().required(),
              fullAddress: Joi.string(),
              location: {
                type: Joi.string(),
                coordinates: Joi.array(),
              },
            }),
            ics: Joi.string(),
            rcs: Joi.string(),
            rna: Joi.string(),
            iban: Joi.string(),
            bic: Joi.string(),
            rhConfig: Joi.object().keys({
              contractWithCompany: {
                grossHourlyRate: Joi.number(),
              },
              contractWithCustomer: {
                grossHourlyRate: Joi.number(),
              },
              feeAmount: Joi.number(),
              amountPerKm: Joi.number(),
              transportSubs: [Joi.array().items({
                department: Joi.string(),
                price: Joi.number(),
              }), Joi.object().keys({
                subId: Joi.objectId().required(),
                price: Joi.number(),
              })],
              templates: {
                contractWithCompany: {
                  driveId: Joi.string().allow(null),
                  link: Joi.string().allow(null),
                },
                contractWithCompanyVersion: {
                  driveId: Joi.string().allow(null),
                  link: Joi.string().allow(null),
                },
                contractWithCustomer: {
                  driveId: Joi.string().allow(null),
                  link: Joi.string().allow(null),
                },
                contractWithCustomerVersion: {
                  driveId: Joi.string().allow(null),
                  link: Joi.string().allow(null),
                },
              },
            }),
            customersConfig: Joi.object().keys({
              billingPeriod: Joi.string().valid(COMPANY_BILLING_PERIODS),
              templates: {
                debitMandate: {
                  driveId: Joi.string().allow(null),
                  link: Joi.string().allow(null),
                },
                quote: {
                  driveId: Joi.string().allow(null),
                  link: Joi.string().allow(null),
                },
              },
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
        auth: { scope: ['companies:edit'] },
        payload: {
          output: 'stream',
          parse: true,
          allow: 'multipart/form-data',
          maxBytes: 5242880,
        },
      },
    });

    server.route({
      method: 'POST',
      path: '/{_id}/internalHours',
      handler: addInternalHour,
      options: {
        auth: { scope: ['config:edit'] },
        validate: {
          params: {
            _id: Joi.objectId().required(),
          },
          payload: Joi.object().keys({
            name: Joi.string().required(),
            default: Joi.boolean(),
          }),
        },
      },
    });

    server.route({
      method: 'POST',
      path: '/',
      handler: create,
      options: {
        auth: { scope: ['config:edit'] },
        validate: {
          payload: Joi.object().keys({
            name: Joi.string().required(),
            type: Joi.string().valid(COMPANY_TYPES).required(),
            rcs: Joi.string(),
            rna: Joi.string(),
            ics: Joi.string(),
            iban: Joi.string(),
            bic: Joi.string(),
            rhConfig: Joi.object().keys({
              contractWithCompany: Joi.object().keys({
                grossHourlyRate: Joi.number(),
              }),
              contractWithCustomer: Joi.object().keys({
                grossHourlyRate: Joi.number(),
              }),
              feeAmount: Joi.number(),
              amountPerKm: Joi.number(),
              transportSubs: [Joi.array().items({
                department: Joi.string(),
                price: Joi.number(),
              }).required().min(1)],
            }).required(),
            customersConfig: Joi.object().keys({
              billingPeriod: Joi.string().valid(COMPANY_BILLING_PERIODS),
            }),
          }),
        },
      },
    });

    server.route({
      method: 'PUT',
      path: '/{_id}/internalHours/{internalHourId}',
      handler: updateInternalHour,
      options: {
        auth: { scope: ['config:edit'] },
        validate: {
          params: {
            _id: Joi.objectId().required(),
            internalHourId: Joi.objectId().required(),
          },
          payload: Joi.object().keys({
            name: Joi.string(),
            default: Joi.boolean(),
          }),
        },
      },
    });

    server.route({
      method: 'GET',
      path: '/{_id}/internalHours',
      handler: getInternalHours,
      options: {
        auth: { scope: ['config:read'] },
        validate: {
          params: { _id: Joi.objectId().required() },
        },
      },
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}/internalHours/{internalHourId}',
      handler: removeInternalHour,
      options: {
        auth: { scope: ['config:edit'] },
        validate: {
          params: {
            _id: Joi.objectId().required(),
            internalHourId: Joi.objectId().required(),
          },
        },
      },
    });
  },
};
