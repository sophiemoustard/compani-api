'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const { list } = require('../controllers/courseHistoryController');

exports.plugin = {
  name: 'routes-course-histories',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['courses:edit'] },
        validate: {
          query: Joi.object({ course: Joi.objectId().required() }),
        },
      },
      handler: list,
    });
  },
};
