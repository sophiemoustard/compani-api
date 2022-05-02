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
  authorizeGetDraftBill,
  authorizeGetBillPdf,
  authorizeBillListCreation,
  authorizeBillCreation,
  authorizeGetBill,
} = require('./preHandlers/bills');
const { COMPANY_BILLING_PERIODS } = require('../models/Company');
const { BILL_TYPES } = require('../models/Bill');
const { billingItemListValidations } = require('./validations/billingItem');
const { dateToISOString } = require('./validations/utils');
const { AUTOMATIC } = require('../helpers/constants');

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
        pre: [{ method: authorizeGetDraftBill }],
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
        pre: [{ method: getBill, assign: 'bill' }, { method: authorizeGetBillPdf }],
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
                  unitExclTaxes: Joi.string().required(),
                  unitInclTaxes: Joi.string().required(),
                  eventsList: Joi.array().items(Joi.object({
                    event: Joi.objectId().required(),
                    startDate: Joi.date().required(),
                    endDate: Joi.date().required(),
                    auxiliary: Joi.objectId().required(),
                    inclTaxesCustomer: Joi.string().when('subscription', { is: Joi.exist(), then: Joi.required() }),
                    exclTaxesCustomer: Joi.string().when('subscription', { is: Joi.exist(), then: Joi.required() }),
                    inclTaxesTpp: Joi.string(),
                    exclTaxesTpp: Joi.string(),
                    thirdPartyPayer: Joi.objectId(),
                    surcharges: Joi.array().items(Joi.object({
                      percentage: Joi.number().required(),
                      name: Joi.string().required(),
                      startHour: Joi.date(),
                      endHour: Joi.date(),
                    })),
                  })).required(),
                  hours: Joi.string().when('subscription', { is: Joi.exist(), then: Joi.required() }),
                  inclTaxes: Joi.number().required(),
                  exclTaxes: Joi.string().required(),
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
                  unitExclTaxes: Joi.string().required(),
                  unitInclTaxes: Joi.string().required(),
                  eventsList: Joi.array().items(Joi.object({
                    event: Joi.objectId().required(),
                    startDate: Joi.date().required(),
                    endDate: Joi.date().required(),
                    auxiliary: Joi.objectId().required(),
                    inclTaxesCustomer: Joi.string().required(),
                    exclTaxesCustomer: Joi.string().required(),
                    inclTaxesTpp: Joi.string().required(),
                    exclTaxesTpp: Joi.string().required(),
                    thirdPartyPayer: Joi.objectId().required(),
                    history: Joi.object().required(),
                    fundingId: Joi.objectId(),
                    nature: Joi.string(),
                  })).required(),
                  hours: Joi.string().required(),
                  inclTaxes: Joi.number().required(),
                  exclTaxes: Joi.string().required(),
                  vat: Joi.number().required(),
                  discountEdition: Joi.boolean(),
                  externalBilling: Joi.boolean(),
                })),
                total: Joi.number(),
              })),
            })),
          }),
        },
        pre: [{ method: authorizeBillListCreation }],
      },
      handler: createBillList,
    });

    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['bills:edit'] },
        validate: {
          query: Joi.object({
            type: Joi.string().valid(...BILL_TYPES).required(),
            startDate: dateToISOString.when('type', { is: AUTOMATIC, then: Joi.required() }),
            endDate: dateToISOString.when('startDate', { is: Joi.exist(), then: Joi.required() }),
          }),
        },
        pre: [{ method: authorizeGetBill }],
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
            shouldBeSent: Joi.boolean().required(),
            ...billingItemListValidations,
          }),
        },
        pre: [{ method: authorizeBillCreation }],
      },
      handler: createBill,
    });
  },
};
