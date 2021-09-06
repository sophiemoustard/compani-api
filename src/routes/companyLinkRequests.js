'use strict';

const Joi = require('joi');

const { create, list, remove } = require('../controllers/companyLinkRequestController');
const {
  authorizeCompanyLinkRequestCreation,
  authorizeCompanyLinkRequestDeletion,
} = require('./preHandlers/companyLinkRequests');

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

    server.route({
      method: 'DELETE',
      path: '/{_id}',
      options: {
        auth: { scope: ['companylinkrequests:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        pre: [{ method: authorizeCompanyLinkRequestDeletion }],
      },
      handler: remove,
    });
  },
};
