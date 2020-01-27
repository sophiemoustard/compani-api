'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const { PHONE_VALIDATION, SIRET_VALIDATION, NAME_VALIDATION } = require('../models/Establishment');
const { create, update, list, remove } = require('../controllers/establishmentController');
const { getEstablishment, authorizeEstablishmentUpdate } = require('./preHandlers/establishments');
const { workHealthServices } = require('../data/workHealthServices');
const { urssafCodes } = require('../data/urssafCodes');

exports.plugin = {
  name: 'routes-establishments',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      handler: create,
      options: {
        auth: { scope: ['establishments:edit'] },
        validate: {
          payload: Joi.object().keys({
            name: Joi.string().regex(new RegExp(NAME_VALIDATION)).required(),
            siret: Joi.string().regex(new RegExp(SIRET_VALIDATION)).required(),
            phone: Joi.string().regex(new RegExp(PHONE_VALIDATION)).required(),
            workHealthService: Joi.string().valid(workHealthServices).required(),
            urssafCode: Joi.string().valid(urssafCodes).required(),
            address: Joi.object().keys({
              street: Joi.string().required(),
              fullAddress: Joi.string().required(),
              zipCode: Joi.string().required(),
              city: Joi.string().required(),
              location: Joi.object().keys({
                type: Joi.string().required(),
                coordinates: Joi.array().length(2).required(),
              }).required(),
            }),
          }),
        },
      },
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      handler: update,
      options: {
        auth: { scope: ['establishments:edit'] },
        validate: {
          payload: Joi.object().keys({
            name: Joi.string().regex(new RegExp(NAME_VALIDATION)),
            siret: Joi.string().regex(new RegExp(SIRET_VALIDATION)),
            phone: Joi.string().regex(new RegExp(PHONE_VALIDATION)),
            workHealthService: Joi.string().valid(workHealthServices),
            urssafCode: Joi.string().valid(urssafCodes),
            address: Joi.object().keys({
              street: Joi.string().required(),
              fullAddress: Joi.string().required(),
              zipCode: Joi.string().required(),
              city: Joi.string().required(),
              location: Joi.object().keys({
                type: Joi.string().required(),
                coordinates: Joi.array().length(2).required(),
              }),
            }),
          }),
        },
        pre: [
          { method: getEstablishment, assign: 'establishment' },
          { method: authorizeEstablishmentUpdate },
        ],
      },
    });

    server.route({
      method: 'GET',
      path: '/',
      handler: list,
      options: {
        auth: { scope: ['establishments:read'] },
      },
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}',
      handler: remove,
      options: {
        auth: { scope: ['establishments:edit'] },
        pre: [
          { method: getEstablishment, assign: 'establishment' },
          { method: authorizeEstablishmentUpdate },
        ],
      },
    });
  },
};
