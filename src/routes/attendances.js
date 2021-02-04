'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { list, create } = require('../controllers/attendanceController');
const { checkCourse, checkAttendanceAddition } = require('./preHandlers/attendances');

exports.plugin = {
  name: 'routes-attendances',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        validate: {
          query: Joi.object({
            courseSlots: Joi.array().items(Joi.objectId()),
          }),
        },
        auth: { scope: ['attendancesheets:edit'] },
        pre: [{ method: checkCourse }],
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
        pre: [{ method: checkAttendanceAddition }],
      },
      handler: create,
    });
  },
};
