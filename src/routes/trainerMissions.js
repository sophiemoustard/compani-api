const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { create } = require('../controllers/TrainerMissionController');
const { authorizeTrainerMissionUpload } = require('./preHandlers/trainerMissions');
const { formDataPayload, requiredDateToISOString } = require('./validations/utils');

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
            courses: Joi.array().items(Joi.objectId()).required().min(1),
            date: requiredDateToISOString,
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
