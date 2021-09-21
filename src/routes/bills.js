'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  draftBillsList,
  createBillList,
  createBill,
  generateBillPdf,
  list,
} = require('../controllers/billsController');
const {
  getBill,
  authorizeGetBill,
  authorizeGetBillPdf,
  authorizeBillsCreation,
  authorizeBillCreation,
} = require('./preHandlers/bills');
const { COMPANY_BILLING_PERIODS } = require('../models/Company');
const { BILL_TYPES } = require('../models/Bill');

exports.plugin = {
  name: 'routes-bill',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/drafts',
      options: {
        auth: { scope: ['bills:edit'] },
        validate: {
          query: Joi.object({
            startDate: Joi.date(),
            endDate: Joi.when(
              'startDate',
              {
                is: Joi.exist(),
                then: Joi.date().required().greater(Joi.ref('startDate')),
                otherwise: Joi.date().required(),
              }
            ),
            billingStartDate: Joi.date().required(),
            billingPeriod: Joi.string().valid(...COMPANY_BILLING_PERIODS).required(),
            customer: Joi.objectId(),
          }),
        },
        pre: [{ method: authorizeGetBill }],
      },
      handler: draftBillsList,
    });

    server.route({
      method: 'GET',
      path: '/{_id}/pdfs',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        pre: [
          { method: getBill, assign: 'bill' },
          { method: authorizeGetBillPdf },
        ],
      },
      handler: generateBillPdf,
    });

    server.route({
      method: 'POST',
      path: '/list',
      options: {
        auth: { scope: ['bills:edit'] },
        validate: {
          payload: Joi.object({
            bills: Joi.array().items(Joi.object({
              customer: Joi.object().required(),
              endDate: Joi.date().required(),
              customerBills: Joi.object({
                bills: Joi.array().items(Joi.object({
                  _id: Joi.objectId(),
                  subscription: Joi.object(),
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
                    inclTaxesCustomer: Joi.number().when('subscription', { is: Joi.exist(), then: Joi.required() }),
                    exclTaxesCustomer: Joi.number().when('subscription', { is: Joi.exist(), then: Joi.required() }),
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
                  hours: Joi.number().when('subscription', { is: Joi.exist(), then: Joi.required() }),
                  inclTaxes: Joi.number().required(),
                  exclTaxes: Joi.number().required(),
                  vat: Joi.number().required(),
                  discountEdition: Joi.boolean(),
                  billingItem: Joi.object({ _id: Joi.objectId(), name: Joi.string() }),
                }).xor('subscription', 'billingItem')),
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
                })),
                total: Joi.number(),
              })),
            })),
          }),
        },
        pre: [{ method: authorizeBillsCreation }],
      },
      handler: createBillList,
    });

    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['bills:edit'] },
        validate: {
          query: Joi.object({ type: Joi.string().valid(...BILL_TYPES).required() }),
        },
      },
      handler: list,
    });

    server.route({
      method: 'POST',
      path: '/',
      options: {
        auth: { scope: ['bills:edit'] },
        validate: {
          payload: Joi.object({
            customer: Joi.objectId().required(),
            date: Joi.date().required(),
            billingItemList: Joi.array().items(Joi.object({
              billingItem: Joi.objectId().required(),
              unitInclTaxes: Joi.number().required(),
              count: Joi.number().required(),
            })),
            netInclTaxes: Joi.number().required(),
          }),
        },
        pre: [{ method: authorizeBillCreation }],
      },
      handler: createBill,
    });
  },
};
