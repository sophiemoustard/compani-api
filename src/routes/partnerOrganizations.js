'use-strict';

const Joi = require('joi');
const { phoneNumberValidation, addressValidation } = require('./validations/utils');
const { create } = require('../controllers/partnerOrganizationController');
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
            phone: phoneNumberValidation.allow('', null),
            address: Joi.alternatives().try(addressValidation, {}),
            email: Joi.string().email().allow('', null),
          }),
        },
        auth: { scope: ['partnerorganization:create'] },
        pre: [{ method: authorizePartnerOrganizationCreation }],
      },
      handler: create,
    });
  },
};
