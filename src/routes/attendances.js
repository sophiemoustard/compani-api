'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { list, create } = require('../controllers/attendanceController');
const { trainerHasAccessToAttendances, authorizeTrainerAndCheckTrainees } = require('./preHandlers/attendances');
const { objectIdOrArray } = require('./validations/utils');

exports.plugin = {
  name: 'routes-attendances',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        validate: {
          query: Joi.object({
            courseSlots: objectIdOrArray.required(),
          }),
        },
        auth: { scope: ['attendancesheets:edit'] },
        pre: [{ method: trainerHasAccessToAttendances, assign: 'query' }],
      },
      handler: list,
    });

    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          payload: Joi.object({
            trainee: Joi.string().required(),
            courseSlot: Joi.string().required(),
          }),
        },
        auth: { scope: ['attendancesheets:edit'] },
        pre: [{ method: authorizeTrainerAndCheckTrainees }],
      },
      handler: create,
    });
  },
};
