'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { list, create } = require('../controllers/attendanceSheetController');

exports.plugin = {
  name: 'routes-attendanceSheets',
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
        validate: {
          payload: Joi.object({
            course: Joi.objectId().required(),
            link: Joi.string().required(),
            trainee: Joi.objectId(),
            date: Joi.date(),
          }),
        },
        auth: { scope: ['courses:edit'] },
      },
      handler: create,
    });
  },
};
