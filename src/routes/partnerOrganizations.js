'use-strict';

const Joi = require('joi');
const { phoneNumberValidation, addressValidation } = require('./validations/utils');
const { create, list, getById, update, createPartner } = require('../controllers/partnerOrganizationController');
const {
  authorizePartnerOrganizationCreation,
  authorizePartnerOrganizationGetById,
  authorizePartnerOrganizationUpdate,
  authorizePartnerCreation,
} = require('./preHandlers/partnerOrganizations');
const { JOBS } = require('../helpers/constants');

exports.plugin = {
  name: 'routes-partnerorganizations',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          payload: Joi.object({
            name: Joi.string().required(),
            phone: phoneNumberValidation,
            address: addressValidation,
            email: Joi.string().email(),
          }),
        },
        auth: { scope: ['partnerorganizations:edit'] },
        pre: [{ method: authorizePartnerOrganizationCreation }],
      },
      handler: create,
    });

    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['partnerorganizations:edit'] },
      },
      handler: list,
    });

    server.route({
      method: 'GET',
      path: '/{_id}',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        auth: { scope: ['partnerorganizations:edit'] },
        pre: [{ method: authorizePartnerOrganizationGetById }],
      },
      handler: getById,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object({
            name: Joi.string(),
            phone: phoneNumberValidation.allow(''),
            address: Joi.alternatives().try(addressValidation, {}),
            email: Joi.string().email().allow(''),
          }),
        },
        auth: { scope: ['partnerorganizations:edit'] },
        pre: [{ method: authorizePartnerOrganizationUpdate }],
      },
      handler: update,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/partners',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object({
            identity: Joi.object({ firstname: Joi.string().required(), lastname: Joi.string().required() }).required(),
            job: Joi.string().valid(...JOBS).allow(''),
            phone: phoneNumberValidation.allow(''),
            email: Joi.string().email().allow(''),
          }),
        },
        auth: { scope: ['partnerorganizations:edit'] },
        pre: [{ method: authorizePartnerCreation }],
      },
      handler: createPartner,
    });
  },
};
