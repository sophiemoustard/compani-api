const Joi = require('joi');
const { list, update } = require('../controllers/partnerController');
const { JOBS } = require('../helpers/constants');
const { authorizePartnerUpdate } = require('./preHandlers/partners');
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
            identity: Joi.object({ firstname: Joi.string().allow(''), lastname: Joi.string() }),
            phone: phoneNumberValidation.allow(''),
            email: Joi.string().email().allow(''),
            job: Joi.string().valid(...JOBS).allow(''),
          }).min(1),
        },
        auth: { scope: ['partners:edit'] },
        pre: [{ method: authorizePartnerUpdate }],
      },
      handler: update,
    });
  },
};
