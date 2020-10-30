'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const { list } = require('../controllers/courseHistoryController');
const { authorizeGetCourseHistories } = require('./preHandlers/courseHistories');

exports.plugin = {
  name: 'routes-course-histories',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['courses:edit'] },
        validate: {
          query: Joi.object({
            course: Joi.objectId().required(),
            createdAt: Joi.date().required(),
          }),
        },
        pre: [{ method: authorizeGetCourseHistories }],
      },
      handler: list,
    });
  },
};
