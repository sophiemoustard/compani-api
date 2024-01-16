const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { create, list } = require('../controllers/trainerMissionController');
const { authorizeTrainerMissionCreation, authorizeTrainerMissionGet } = require('./preHandlers/trainerMissions');
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
            file: Joi.any(),
            fee: Joi.number().positive().required(),
          }),
        },
        pre: [{ method: authorizeTrainerMissionCreation }],
      },
      handler: create,
    });

    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['trainermissions:read'] },
        validate: {
          query: Joi.object({ trainer: Joi.objectId().required() }),
        },
        pre: [{ method: authorizeTrainerMissionGet }],
      },
      handler: list,
    });
  },
};
