'use strict';

const Joi = require('joi');

const { create, list } = require('../controllers/companyLinkRequestController');
const { authorizeCompanyLinkRequestCreation } = require('./preHandlers/companyLinkRequests');

exports.plugin = {
  name: 'routes-company-link-requests',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        auth: { mode: 'required' },
        validate: {
          payload: Joi.object().keys({ company: Joi.string().required() }),
        },
        pre: [{ method: authorizeCompanyLinkRequestCreation }],
      },
      handler: create,
    });

    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['companylinkrequests:edit'] },
      },
      handler: list,
    });
  },
};
