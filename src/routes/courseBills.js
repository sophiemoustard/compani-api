'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { list, create } = require('../controllers/courseBillController');
const { authorizeCourseBillCreation, authorizeCourseBillGet } = require('./preHandlers/courseBills');

exports.plugin = {
  name: 'routes-course-bills',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['config:vendor'] },
        validate: { query: Joi.object({ course: Joi.objectId().required() }) },
        pre: [{ method: authorizeCourseBillGet }],
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
            mainFee: Joi.object({ price: Joi.number().positive().required() }).required(),
            company: Joi.objectId().required(),
            courseFundingOrganisation: Joi.objectId(),
          }),
        },
        auth: { scope: ['config:vendor'] },
        pre: [{ method: authorizeCourseBillCreation }],
      },
      handler: create,
    });
  },
};
