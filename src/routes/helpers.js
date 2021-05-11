'use strict';

const Joi = require('joi');
const { list, update } = require('../controllers/helperController');
const { authorizeHelpersGet } = require('./preHandlers/helpers');

exports.plugin = {
  name: 'routes-helpers',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        validate: {
          query: Joi.object({ customer: Joi.objectId() }).required(),
        },
        auth: { scope: ['helpers:list'] },
        pre: [{ method: authorizeHelpersGet }],
      },
      handler: list,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object({
            referent: Joi.boolean().valid(true),
          }),
        },
        auth: { scope: ['helpers:edit'] },
      },
      handler: update,
    });
  },
};
