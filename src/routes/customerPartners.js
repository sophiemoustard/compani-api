const Joi = require('joi');
const { create } = require('../controllers/customerPartnerController');
const { authorizeCustomerPartnerCreation } = require('./preHandlers/customerPartners');

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
  },
};
