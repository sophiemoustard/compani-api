const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { create } = require('../controllers/trainingContractController');
const { authorizeTrainingContractUpload } = require('./preHandlers/trainingContracts');

const { formDataPayload } = require('./validations/utils');

exports.plugin = {
  name: 'routes-trainingcontracts',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        payload: formDataPayload(),
        validate: {
          payload: Joi.object({
            course: Joi.objectId().required(),
            file: Joi.any().required(),
            company: Joi.objectId().required(),
          }),
        },
        auth: { scope: ['courses:create'] },
        pre: [{ method: authorizeTrainingContractUpload }],
      },
      handler: create,
    });
  },
};
