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
        auth: { scope: ['courses:create'] },
        payload: formDataPayload(),
        validate: {
          payload: Joi.object({
            course: Joi.objectId().required(),
            file: Joi.any().required(),
            company: Joi.objectId().required(),
          }),
        },
        pre: [{ method: authorizeTrainingContractUpload }],
      },
      handler: create,
    });
  },
};
