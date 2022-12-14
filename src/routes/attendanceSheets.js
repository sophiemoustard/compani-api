'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { list, create, deleteAttendanceSheet } = require('../controllers/attendanceSheetController');
const { formDataPayload } = require('./validations/utils');
const {
  authorizeAttendanceSheetCreation,
  authorizeAttendanceSheetDeletion,
  authorizeAttendanceSheetsGet,
} = require('./preHandlers/attendanceSheets');

exports.plugin = {
  name: 'routes-attendancesheets',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['attendances:read'] },
        validate: {
          query: Joi.object({ course: Joi.objectId() }),
        },
        pre: [{ method: authorizeAttendanceSheetsGet, assign: 'companyId' }],
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
          }).xor('trainee', 'date'),
        },
        auth: { scope: ['attendances:edit'] },
        pre: [{ method: authorizeAttendanceSheetCreation }],
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
        auth: { scope: ['attendances:edit'] },
        pre: [{ method: authorizeAttendanceSheetDeletion, assign: 'attendanceSheet' }],
      },
      handler: deleteAttendanceSheet,
    });
  },
};
