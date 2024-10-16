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
const { ORIGIN_OPTIONS, MOBILE } = require('../helpers/constants');

exports.plugin = {
  name: 'routes-attendancesheets',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['attendances:read'] },
        validate: {
          query: Joi.object({
            course: Joi.objectId().required(),
            company: Joi.objectId(),
            holding: Joi.objectId(),
          }).oxor('company', 'holding'),
        },
        pre: [{ method: authorizeAttendanceSheetsGet }],
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
            file: Joi.any(),
            signature: Joi.any(),
            trainee: Joi.objectId(),
            date: Joi.date(),
            slot: Joi.objectId()
              .when('signature', { is: Joi.exist(), then: Joi.required(), otherwise: Joi.forbidden() }),
            origin: Joi.string().valid(...ORIGIN_OPTIONS).default(MOBILE),
          }).xor('trainee', 'date')
            .xor('signature', 'file'),
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
        pre: [{ method: authorizeAttendanceSheetDeletion }],
      },
      handler: deleteAttendanceSheet,
    });
  },
};
