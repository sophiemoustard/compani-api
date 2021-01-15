'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { list, create, deleteAttendanceSheet } = require('../controllers/attendanceSheetController');
const { formDataPayload } = require('./validations/utils');
const { checkCourseType, attendanceSheetExists } = require('./preHandlers/attendanceSheets');

exports.plugin = {
  name: 'routes-attendancesheets',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['courses:read'] },
        validate: {
          query: Joi.object({ course: Joi.objectId() }),
        },
      },
      handler: list,
    });

    server.route({
      method: 'POST',
      path: '/',
      options: {
        payload: formDataPayload(),
        validate: {
          payload: Joi.object({
            course: Joi.objectId().required(),
            file: Joi.any().required(),
            trainee: Joi.objectId(),
            date: Joi.date(),
          }),
        },
        auth: { scope: ['attendancesheets:edit'] },
        pre: [{ method: checkCourseType }],
      },
      handler: create,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        auth: { scope: ['attendancesheets:edit'] },
        pre: [{ method: attendanceSheetExists, assign: 'attendanceSheet' }],
      },
      handler: deleteAttendanceSheet,
    });
  },
};
