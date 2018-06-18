'use strict';

const Joi = require('joi');

exports.plugin = {
  name: 'routes-bookmarks',
  register: async (server, options) => {
    server.route({
      method: 'GET',
      path: '/',
      handler: (request, h) => {
        return 'YAY!';
      },
      options: {
        validate: {
          query: {
            num: Joi.number().integer().min(1).max(100).default(10)
          }
        }
      }
    });
  }};
