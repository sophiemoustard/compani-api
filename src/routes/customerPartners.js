const Joi = require('joi');
const { create, list } = require('../controllers/customerPartnerController');
const { authorizeCustomerPartnerCreation, authorizeCustomerPartnersGet } = require('./preHandlers/customerPartners');

exports.plugin = {
  name: 'routes-customer-partners',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        auth: { scope: ['customers:edit'] },
        validate: {
          payload: Joi.object().keys({
            partner: Joi.objectId().required(),
            customer: Joi.objectId().required(),
          }),
        },
        pre: [{ method: authorizeCustomerPartnerCreation }],
      },
      handler: create,
    });

    server.route({
      method: 'GET',
      path: '/',
      options: {
        validate: {
          query: Joi.object({ customer: Joi.objectId().required() }),
        },
        auth: { scope: ['customers:read'] },
        pre: [{ method: authorizeCustomerPartnersGet }],
      },
      handler: list,
    });
  },
};
