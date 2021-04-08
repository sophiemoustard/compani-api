'use-strict';

const Joi = require('joi');
const { phoneNumberValidation, addressValidation } = require('./validations/utils');
const { create, list } = require('../controllers/partnerOrganizationController');
const { authorizePartnerOrganizationCreation } = require('./preHandlers/partnerOrganizations');

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
        auth: { scope: ['partnerorganization:create'] },
        pre: [{ method: authorizePartnerOrganizationCreation }],
      },
      handler: create,
    });

    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['partnerorganization:read'] },
      },
      handler: list,
    });
  },
};
