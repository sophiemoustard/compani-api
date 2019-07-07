'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  create,
  list,
  update,
  remove,
  getById,
  generateCreditNotePdf,
} = require('../controllers/creditNoteController');

const { FIXED, HOURLY } = require('../helpers/constants');

exports.plugin = {
  name: 'routes-credit-notes',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      handler: create,
      options: {
        auth: { strategy: 'jwt' },
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
                fundingVersion: Joi.objectId(),
                nature: Joi.string(),
                careHours: Joi.number(),
              }).required(),
            })),
            subscription: Joi.object().keys({
              _id: Joi.objectId(),
              service: Joi.object().required().keys({
                serviceId: Joi.objectId().required(),
                name: Joi.string().required(),
                nature: Joi.string().required().valid([FIXED, HOURLY])
              }),
              vat: Joi.number(),
              unitInclTaxes: Joi.number(),
            }),
          })
        },
      },
    });

    server.route({
      method: 'GET',
      path: '/',
      handler: list,
      options: {
        auth: { strategy: 'jwt' },
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
      method: 'GET',
      path: '/{_id}',
      handler: getById,
      options: {
        auth: { strategy: 'jwt' },
        validate: {
          params: {
            _id: Joi.objectId().required()
          }
        }
      },
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}',
      handler: remove,
      options: {
        auth: { strategy: 'jwt' },
        validate: {
          params: {
            _id: Joi.objectId().required(),
          }
        },
      },
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      handler: update,
      options: {
        auth: { strategy: 'jwt' },
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
                fundingVersion: Joi.objectId(),
                nature: Joi.string(),
                careHours: Joi.number(),
              }).required(),
            })),
            subscription: Joi.object().keys({
              _id: Joi.objectId(),
              service: Joi.object().keys({
                serviceId: Joi.objectId().required(),
                name: Joi.string().required(),
                nature: Joi.string().required().valid([FIXED, HOURLY])
              }),
              vat: Joi.number(),
              unitInclTaxes: Joi.number(),
            }),
          })
        },
      },
    });

    server.route({
      method: 'GET',
      path: '/{_id}/pdfs',
      options: {
        validate: {
          params: { _id: Joi.objectId() },
        },
        auth: { strategy: 'jwt' },
      },
      handler: generateCreditNotePdf,
    });
  }
};
