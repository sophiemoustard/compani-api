'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  draftBillsList,
  createBills,
} = require('../controllers/billsController');
const { MONTH, TWO_WEEKS } = require('../helpers/constants');

exports.plugin = {
  name: 'routes-bill',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/drafts',
      options: {
        auth: { strategy: 'jwt' },
        validate: {
          query: {
            endDate: Joi.date().required(),
            startDate: Joi.date().required(),
            billingPeriod: Joi.string().valid([MONTH, TWO_WEEKS]).required(),
          },
        },
      },
      handler: draftBillsList,
    });

    server.route({
      method: 'POST',
      path: '/',
      options: {
        auth: { strategy: 'jwt' },
        validate: {
          payload: {
            bills: Joi.array().items(Joi.object({
              customer: Joi.object(),
              customerBills: Joi.object({
                bills: Joi.array().items(Joi.object({
                  subscription: Joi.object(),
                  discount: Joi.number(),
                  startDate: Joi.date(),
                  endDate: Joi.date(),
                  unitExclTaxes: Joi.number(),
                  eventsList: Joi.array().items(Joi.object({
                    event: Joi.objectId(),
                    inclTaxesCustomer: Joi.number(),
                    exclTaxesCustomer: Joi.number(),
                    inclTaxesTpp: Joi.number(),
                    exclTaxesTpp: Joi.number(),
                    thirdPartyPayer: Joi.objectId(),
                  })),
                  hours: Joi.number(),
                  inclTaxes: Joi.number(),
                  exclTaxes: Joi.number(),
                })),
              }),
              thirdPartyPayerBills: Joi.array().items(Joi.object({
                bills: Joi.array().items(Joi.object({
                  subscription: Joi.object(),
                  thirdPartyPayer: Joi.object(),
                  discount: Joi.number(),
                  startDate: Joi.date(),
                  endDate: Joi.date(),
                  unitExclTaxes: Joi.number(),
                  eventsList: Joi.array().items(Joi.object({
                    event: Joi.objectId(),
                    inclTaxesCustomer: Joi.number(),
                    exclTaxesCustomer: Joi.number(),
                    inclTaxesTpp: Joi.number(),
                    exclTaxesTpp: Joi.number(),
                    thirdPartyPayer: Joi.objectId(),
                  })),
                  hours: Joi.number(),
                  inclTaxes: Joi.number(),
                  exclTaxes: Joi.number(),
                })),
              })),
            })),
          },
        },
      },
      handler: createBills,
    });
  },
};
