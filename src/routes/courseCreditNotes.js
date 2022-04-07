'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { create } = require('../controllers/courseCreditNoteController');
const { authorizeCourseCreditNoteCreation } = require('./preHandlers/courseCreditNotes');
const { requiredDateToISOString } = require('./validations/utils');

exports.plugin = {
  name: 'routes-course-credit-notes',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      handler: create,
      options: {
        auth: { scope: ['config:vendor'] },
        validate: {
          payload: Joi.object().keys({
            courseBill: Joi.objectId().required(),
            misc: Joi.string().allow('', null),
            date: requiredDateToISOString,
            company: Joi.objectId().required(),
          }),
        },
        pre: [{ method: authorizeCourseCreditNoteCreation }],
      },
    });
  },
};
