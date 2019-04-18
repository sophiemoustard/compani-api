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
            exclTaxesCustomer: Joi.number().required(),
            inclTaxesCustomer: Joi.number().required(),
            events: Joi.array().items(Joi.objectId()),
            subscription: Joi.object().keys({
              _id: Joi.objectId(),
              service: Joi.string(),
              vat: Joi.number(),
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
            exclTaxesCustomer: Joi.number(),
            inclTaxesCustomer: Joi.number(),
            events: Joi.array().items(Joi.objectId()),
            subscription: Joi.object().keys({
              _id: Joi.objectId(),
              service: Joi.string(),
              vat: Joi.number(),
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
