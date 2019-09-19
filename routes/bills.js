'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  draftBillsList,
  createBills,
  list,
  generateBillPdf,
} = require('../controllers/billsController');
const { COMPANY_BILLING_PERIODS } = require('../models/Company');

exports.plugin = {
  name: 'routes-bill',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/drafts',
      options: {
        auth: { scope: ['billing:edit'] },
        validate: {
          query: {
            endDate: Joi.date().required(),
            startDate: Joi.date(),
            billingStartDate: Joi.date().required(),
            billingPeriod: Joi.string().valid(COMPANY_BILLING_PERIODS).required(),
            customer: Joi.objectId(),
          },
        },
      },
      handler: draftBillsList,
    });

    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['billing:read'] },
        validate: {
          query: {
            endDate: Joi.date(),
            startDate: Joi.date(),
            customer: Joi.objectId(),
          },
        },
      },
      handler: list,
    });

    server.route({
      method: 'GET',
      path: '/{_id}/pdfs',
      options: {
        auth: { scope: ['billing:read'] },
        validate: {
          params: { _id: Joi.objectId() },
        },
      },
      handler: generateBillPdf,
    });

    server.route({
      method: 'POST',
      path: '/',
      options: {
        auth: { scope: ['billing:edit'] },
        validate: {
          payload: {
            bills: Joi.array().items(Joi.object({
              customerId: Joi.objectId(),
              customer: Joi.object().required(),
              customerBills: Joi.object({
                bills: Joi.array().items(Joi.object({
                  _id: Joi.objectId(),
                  subscription: Joi.object().required(),
                  discount: Joi.number().required(),
                  startDate: Joi.date().required(),
                  endDate: Joi.date().required(),
                  unitExclTaxes: Joi.number().required(),
                  unitInclTaxes: Joi.number().required(),
                  eventsList: Joi.array().items(Joi.object({
                    event: Joi.objectId().required(),
                    startDate: Joi.date().required(),
                    endDate: Joi.date().required(),
                    auxiliary: Joi.objectId().required(),
                    inclTaxesCustomer: Joi.number().required(),
                    exclTaxesCustomer: Joi.number().required(),
                    inclTaxesTpp: Joi.number(),
                    exclTaxesTpp: Joi.number(),
                    thirdPartyPayer: Joi.objectId(),
                    surcharges: Joi.array().items(Joi.object({
                      percentage: Joi.number().required(),
                      name: Joi.string().required(),
                      startHour: Joi.date(),
                      endHour: Joi.date(),
                    })),
                  })).required(),
                  hours: Joi.number().required(),
                  inclTaxes: Joi.number().required(),
                  exclTaxes: Joi.number().required(),
                  vat: Joi.number().required(),
                  discountEdition: Joi.boolean(),
                  identity: Joi.object(),
                })),
                shouldBeSent: Joi.boolean(),
                total: Joi.number(),
              }),
              thirdPartyPayerBills: Joi.array().items(Joi.object({
                bills: Joi.array().items(Joi.object({
                  _id: Joi.objectId(),
                  subscription: Joi.object().required(),
                  thirdPartyPayer: Joi.object().required(),
                  discount: Joi.number().required(),
                  startDate: Joi.date().required(),
                  endDate: Joi.date().required(),
                  unitExclTaxes: Joi.number().required(),
                  unitInclTaxes: Joi.number().required(),
                  eventsList: Joi.array().items(Joi.object({
                    event: Joi.objectId().required(),
                    startDate: Joi.date().required(),
                    endDate: Joi.date().required(),
                    auxiliary: Joi.objectId().required(),
                    inclTaxesCustomer: Joi.number().required(),
                    exclTaxesCustomer: Joi.number().required(),
                    inclTaxesTpp: Joi.number().required(),
                    exclTaxesTpp: Joi.number().required(),
                    thirdPartyPayer: Joi.objectId().required(),
                    history: Joi.object().required(),
                    fundingId: Joi.objectId(),
                    nature: Joi.string(),
                  })).required(),
                  hours: Joi.number().required(),
                  inclTaxes: Joi.number().required(),
                  exclTaxes: Joi.number().required(),
                  vat: Joi.number().required(),
                  discountEdition: Joi.boolean(),
                  externalBilling: Joi.boolean(),
                  identity: Joi.object(),
                })),
                total: Joi.number(),
              })),
            })),
          },
        },
      },
      handler: createBills,
    });
  },
};
