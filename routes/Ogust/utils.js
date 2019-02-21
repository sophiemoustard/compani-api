'use strict';

const Joi = require('joi');

const { getOgustToken } = require('../../controllers/Ogust/tokenController');
const { getList } = require('../../controllers/Ogust/utilsController');

exports.plugin = {
  name: 'routes-ogust-utils',
  register: async (server) => {
    // Get Ogust token
    server.route({
      method: 'GET',
      path: '/token',
      options: {
        auth: 'jwt'
      },
      handler: getOgustToken
    });
    // Get List
    server.route({
      method: 'POST',
      path: '/utils/getList',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          query: {
            key: Joi.string().required()
          }
        },
        auth: false
      },
      handler: getList
    });
  }
};
