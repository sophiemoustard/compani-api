const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { create } = require('../controllers/trainerMissionController');
const { authorizeTrainerMissionUpload } = require('./preHandlers/trainerMissions');
const { formDataPayload } = require('./validations/utils');

exports.plugin = {
  name: 'routes-trainermissions',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        auth: { scope: ['courses:create'] },
        payload: formDataPayload(),
        validate: {
          payload: Joi.object({
            trainer: Joi.objectId().required(),
            courses: Joi.alternatives().try(Joi.array().items(Joi.objectId()).min(1), Joi.objectId()).required(),
            file: Joi.any().required(),
            fee: Joi.number().positive().required(),
          }),
        },
        pre: [{ method: authorizeTrainerMissionUpload }],
      },
      handler: create,
    });
  },
};
