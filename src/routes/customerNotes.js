const Joi = require('joi');
const { authorizeCustomerNoteCreation, authorizeCustomerNoteGet } = require('./preHandlers/customerNotes');
const { create, list } = require('../controllers/customerNoteController');

exports.plugin = {
  name: 'routes-customer-notes',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          payload: Joi.object({
            title: Joi.string().required(),
            description: Joi.string().required(),
            customer: Joi.objectId().required(),
          }),
        },
        auth: { scope: ['customers:edit'] },
        pre: [{ method: authorizeCustomerNoteCreation }],
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
        auth: { scope: ['customers:edit'] },
        pre: [{ method: authorizeCustomerNoteGet }],
      },
      handler: list,
    });
  },
};
