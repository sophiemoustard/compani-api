'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const { create, update, list, remove } = require('../controllers/establishmentController');
const { authorizeEstablishmentUpdate, authorizeEstablishmentDeletion } = require('./preHandlers/establishments');
const { workHealthServices } = require('../data/workHealthServices');
const { urssafCodes } = require('../data/urssafCodes');
const { addressValidation, phoneNumberValidation, siretValidation } = require('./validations/utils');
const { ESTABLISHMENT_NAME_VALIDATION } = require('../models/Establishment');

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
            name: Joi.string().regex(ESTABLISHMENT_NAME_VALIDATION).required(),
            siret: siretValidation.required(),
            phone: phoneNumberValidation.required(),
            workHealthService: Joi.string().valid(...workHealthServices).required(),
            urssafCode: Joi.string().valid(...urssafCodes).required(),
            address: addressValidation,
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
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object().keys({
            name: Joi.string().regex(ESTABLISHMENT_NAME_VALIDATION),
            siret: siretValidation,
            phone: phoneNumberValidation,
            workHealthService: Joi.string().valid(...workHealthServices),
            urssafCode: Joi.string().valid(...urssafCodes),
            address: addressValidation,
          }),
        },
        pre: [{ method: authorizeEstablishmentUpdate }],
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
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        pre: [
          { method: authorizeEstablishmentUpdate, assign: 'establishment' },
          { method: authorizeEstablishmentDeletion },
        ],
      },
    });
  },
};
