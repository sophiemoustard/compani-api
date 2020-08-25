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

const { authorizeServicesUpdate } = require('./preHandlers/services');

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
            }),
            nature: Joi.string().required().valid(...SERVICE_NATURES),
          }),
        },
      },
    });

    server.route({
      method: 'GET',
      path: '/',
      handler: list,
      options: {
        auth: { scope: ['config:read'] },
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
        pre: [{ method: authorizeServicesUpdate }],
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
          payload: Joi.object().keys({
            startDate: Joi.date().required(),
            defaultUnitAmount: Joi.number(),
            name: Joi.string(),
            vat: Joi.number(),
            surcharge: Joi.objectId(),
            exemptFromCharges: Joi.boolean(),
          }),
        },
        pre: [{ method: authorizeServicesUpdate }],
      },
    });
  },
};
