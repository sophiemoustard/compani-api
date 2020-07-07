'use-strict';

const Joi = require('@hapi/joi');
Joi.objectId = require('joi-objectid')(Joi);
const { addActivity } = require('../controllers/moduleController');

exports.plugin = {
  name: 'routes-modules',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/{_id}/activity',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId() }),
          payload: Joi.object({ title: Joi.string().required() }),
        },
        auth: { scope: ['programs:edit'] },
      },
      handler: addActivity,
    });
  },
};
