'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { list, listUnsubscribed, create, remove } = require('../controllers/attendanceController');
const {
  authorizeAttendancesGet,
  authorizeAttendanceCreation,
  authorizeAttendanceDeletion,
  authorizeUnsubscribedAttendancesGet,
} = require('./preHandlers/attendances');

exports.plugin = {
  name: 'routes-attendances',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        validate: {
          query: Joi.alternatives().try(
            Joi.object({ courseSlot: Joi.objectId().required() }),
            Joi.object({ course: Joi.objectId().required() })
          ),
        },
        auth: { scope: ['attendances:read'] },
        pre: [{ method: authorizeAttendancesGet, assign: 'attendancesInfos' }],
      },
      handler: list,
    });

    server.route({
      method: 'GET',
      path: '/unsubscribed',
      options: {
        auth: { scope: ['attendances:read'] },
        validate: {
          query: Joi.alternatives().try(
            Joi.object({ course: Joi.objectId().required(), company: Joi.objectId() }),
            Joi.object({ trainee: Joi.objectId().required() })
          ),
        },
        pre: [{ method: authorizeUnsubscribedAttendancesGet }],
      },
      handler: listUnsubscribed,
    });

    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          payload: Joi.object({ trainee: Joi.string(), courseSlot: Joi.string().required() }),
        },
        auth: { scope: ['attendances:edit'] },
        pre: [{ method: authorizeAttendanceCreation }],
      },
      handler: create,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}',
      options: {
        validate: { params: Joi.object({ _id: Joi.objectId().required() }) },
        auth: { scope: ['attendances:edit'] },
        pre: [{ method: authorizeAttendanceDeletion }],
      },
      handler: remove,
    });
  },
};
