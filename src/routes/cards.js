'use-strict';

const Joi = require('@hapi/joi');
Joi.objectId = require('joi-objectid')(Joi);
const { update } = require('../controllers/cardController');

exports.plugin = {
  name: 'routes-cards',
  register: async (server) => {
    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object({
            title: Joi.string(),
          }),
        },
        auth: { scope: ['programs:edit'] },
      },
      handler: update,
    });
  },
};
