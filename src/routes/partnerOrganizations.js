'use-strict';

const Joi = require('joi');
const { phoneNumberValidation, addressValidation } = require('./validations/utils');
const { create, list, getById, update } = require('../controllers/partnerOrganizationController');
const {
  checkPartnerOrganizationAlreadyExists,
  partnerOrganizationExists,
  authorizePartnerOrganizationEdit,
} = require('./preHandlers/partnerOrganizations');

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
        pre: [{ method: checkPartnerOrganizationAlreadyExists }],
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
        pre: [{ method: partnerOrganizationExists }],
      },
      handler: getById,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.alternatives().try(
            Joi.object({ name: Joi.string().required() }),
            Joi.object({ phone: phoneNumberValidation.required() }),
            Joi.object({ address: addressValidation.required() }),
            Joi.object({ email: Joi.string().email().required() })
          ),
        },
        auth: { scope: ['partnerorganizations:edit'] },
        pre: [{ method: authorizePartnerOrganizationEdit }],
      },
      handler: update,
    });
  },
};
