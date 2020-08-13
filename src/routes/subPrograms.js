'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { update } = require('../controllers/subProgramController');

exports.plugin = {
  name: 'routes-sub-programs',
  register: async (server) => {
    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object({ name: Joi.string().required() }),
        },
        auth: { scope: ['programs:edit'] },
      },
      handler: update,
    });
  },
};
