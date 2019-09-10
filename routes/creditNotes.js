'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  create,
  list,
  update,
  remove,
  generateCreditNotePdf,
} = require('../controllers/creditNoteController');

const { SERVICE_NATURES } = require('../models/Service');

exports.plugin = {
  name: 'routes-credit-notes',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      handler: create,
      options: {
        auth: { scope: ['billing:edit'] },
        validate: {
          payload: Joi.object().keys({
            date: Joi.date().required(),
            startDate: Joi.date(),
            endDate: Joi.date(),
            customer: Joi.objectId().required(),
            thirdPartyPayer: Joi.objectId(),
            exclTaxesCustomer: Joi.number(),
            inclTaxesCustomer: Joi.number(),
            exclTaxesTpp: Joi.number().when('thirdPartyPayer', { is: Joi.exist(), then: Joi.required() }),
            inclTaxesTpp: Joi.number().when('thirdPartyPayer', { is: Joi.exist(), then: Joi.required() }),
            events: Joi.array().items(Joi.object().keys({
              eventId: Joi.objectId().required(),
              auxiliary: Joi.objectId().required(),
              serviceName: Joi.string().required(),
              startDate: Joi.date().required(),
              endDate: Joi.date().required(),
              bills: Joi.object().keys({
                inclTaxesCustomer: Joi.number(),
                exclTaxesCustomer: Joi.number(),
                thirdPartyPayer: Joi.objectId(),
                inclTaxesTpp: Joi.number(),
                exclTaxesTpp: Joi.number(),
                fundingId: Joi.objectId(),
                nature: Joi.string(),
                careHours: Joi.number(),
                surcharges: Joi.array().items(Joi.object({
                  percentage: Joi.number().required(),
                  name: Joi.string().required(),
                  startHour: Joi.date(),
                  endHour: Joi.date(),
                })),
              }).required(),
            })),
            subscription: Joi.object().keys({
              _id: Joi.objectId(),
              service: Joi.object().required().keys({
                serviceId: Joi.objectId().required(),
                name: Joi.string().required(),
                nature: Joi.string().required().valid(SERVICE_NATURES),
              }),
              vat: Joi.number(),
              unitInclTaxes: Joi.number(),
            }),
          }),
        },
      },
    });

    server.route({
      method: 'GET',
      path: '/',
      handler: list,
      options: {
        auth: { scope: ['billing:read'] },
        validate: {
          query: {
            startDate: Joi.date(),
            endDate: Joi.date(),
            customer: Joi.objectId(),
          },
        },
      },
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}',
      handler: remove,
      options: {
        auth: { scope: ['billing:edit'] },
        validate: {
          params: {
            _id: Joi.objectId().required(),
          },
        },
      },
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      handler: update,
      options: {
        auth: { scope: ['billing:edit'] },
        validate: {
          params: {
            _id: Joi.objectId().required(),
          },
          payload: Joi.object().keys({
            date: Joi.date(),
            startDate: Joi.date(),
            endDate: Joi.date(),
            customer: Joi.objectId(),
            thirdPartyPayer: Joi.objectId(),
            exclTaxesCustomer: Joi.number(),
            inclTaxesCustomer: Joi.number(),
            exclTaxesTpp: Joi.number().when('thirdPartyPayer', { is: Joi.exist(), then: Joi.required() }),
            inclTaxesTpp: Joi.number().when('thirdPartyPayer', { is: Joi.exist(), then: Joi.required() }),
            events: Joi.array().items(Joi.object().keys({
              eventId: Joi.objectId().required(),
              auxiliary: Joi.objectId().required(),
              serviceName: Joi.string().required(),
              startDate: Joi.date().required(),
              endDate: Joi.date().required(),
              bills: Joi.object().keys({
                inclTaxesCustomer: Joi.number(),
                exclTaxesCustomer: Joi.number(),
                thirdPartyPayer: Joi.objectId(),
                inclTaxesTpp: Joi.number(),
                exclTaxesTpp: Joi.number(),
                fundingId: Joi.objectId(),
                nature: Joi.string(),
                careHours: Joi.number(),
                surcharges: Joi.array().items(Joi.object({
                  percentage: Joi.number().required(),
                  name: Joi.string().required(),
                  startHour: Joi.date(),
                  endHour: Joi.date(),
                })),
              }).required(),
            })),
            subscription: Joi.object().keys({
              _id: Joi.objectId(),
              service: Joi.object().keys({
                serviceId: Joi.objectId().required(),
                name: Joi.string().required(),
                nature: Joi.string().required().valid(SERVICE_NATURES),
              }),
              vat: Joi.number(),
              unitInclTaxes: Joi.number(),
            }),
          }),
        },
      },
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
      handler: generateCreditNotePdf,
    });
  },
};
