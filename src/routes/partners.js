const Joi = require('joi');
const { list, update } = require('../controllers/partnerController');
const { phoneNumberValidation } = require('./validations/utils');

exports.plugin = {
  name: 'routes-partners',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['partners:read'] },
      },
      handler: list,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object().keys({
            identity: Joi.object({
              firstname: Joi.string().allow(''),
              lastname: Joi.string(),
            }),
            phone: phoneNumberValidation.allow(''),
            email: Joi.string().email().allow(''),
          }).min(1),
        },
        auth: { scope: ['partners:edit'] },
      },
      handler: update,
    });
  },
};
