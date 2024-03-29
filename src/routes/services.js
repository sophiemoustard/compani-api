'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const { SERVICE_NATURES } = require('../models/Service');

const {
  list,
  create,
  update,
  remove,
} = require('../controllers/serviceController');

const {
  authorizeServiceCreation,
  authorizeServicesUpdate,
  authorizeServicesDeletion,
} = require('./preHandlers/services');

exports.plugin = {
  name: 'routes-services',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      handler: create,
      options: {
        auth: { scope: ['config:edit'] },
        validate: {
          payload: Joi.object().keys({
            versions: Joi.array().items({
              startDate: Joi.date().required(),
              defaultUnitAmount: Joi.number().required(),
              name: Joi.string().required(),
              vat: Joi.number().default(0),
              surcharge: Joi.objectId(),
              exemptFromCharges: Joi.boolean().required(),
              billingItems: Joi.array().items(Joi.objectId()),
            }),
            nature: Joi.string().required().valid(...SERVICE_NATURES),
          }),
        },
        pre: [{ method: authorizeServiceCreation }],
      },
    });

    server.route({
      method: 'GET',
      path: '/',
      handler: list,
      options: {
        auth: { scope: ['config:read'] },
        validate: {
          query: Joi.object().keys({ isArchived: Joi.boolean() }),
        },
      },
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}',
      handler: remove,
      options: {
        auth: { scope: ['config:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        pre: [{ method: authorizeServicesDeletion }],
      },
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      handler: update,
      options: {
        auth: { scope: ['config:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.alternatives().try(
            Joi.object().keys({
              startDate: Joi.date().required(),
              defaultUnitAmount: Joi.number(),
              name: Joi.string(),
              vat: Joi.number(),
              surcharge: Joi.objectId(),
              exemptFromCharges: Joi.boolean(),
              billingItems: Joi.array().items(Joi.objectId()),
            }),
            Joi.object().keys({ isArchived: Joi.boolean().required() })
          ),
        },
        pre: [{ method: authorizeServicesUpdate }],
      },
    });
  },
};
