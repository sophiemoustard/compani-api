const Joi = require('joi');
const { create, list, update } = require('../controllers/customerPartnerController');
const {
  authorizeCustomerPartnerCreation,
  authorizeCustomerPartnersGet,
  authorizeCustomerPartnersUpdate,
} = require('./preHandlers/customerPartners');

exports.plugin = {
  name: 'routes-customer-partners',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        auth: { scope: ['customerpartners:edit'] },
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
        auth: { scope: ['customerpartners:edit'] },
        pre: [{ method: authorizeCustomerPartnersGet }],
      },
      handler: list,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object({ prescriber: Joi.boolean().required() }),
        },
        auth: { scope: ['customerpartners:edit'] },
        pre: [{ method: authorizeCustomerPartnersUpdate }],
      },
      handler: update,
    });
  },
};
