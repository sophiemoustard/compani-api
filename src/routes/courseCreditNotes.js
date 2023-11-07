'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { create, generateCreditNotePdf } = require('../controllers/courseCreditNoteController');
const { authorizeCourseCreditNoteCreation, authorizeCreditNotePdfGet } = require('./preHandlers/courseCreditNotes');
const { requiredDateToISOString } = require('./validations/utils');

exports.plugin = {
  name: 'routes-course-credit-notes',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      handler: create,
      options: {
        auth: { scope: ['coursebills:edit'] },
        validate: {
          payload: Joi.object().keys({
            courseBill: Joi.objectId().required(),
            misc: Joi.string().allow('', null),
            date: requiredDateToISOString,
            companies: Joi.array().items(Joi.objectId()).required(),
          }),
        },
        pre: [{ method: authorizeCourseCreditNoteCreation }],
      },
    });

    server.route({
      method: 'GET',
      path: '/{_id}/pdfs',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        auth: { scope: ['coursebills:read'] },
        pre: [{ method: authorizeCreditNotePdfGet }],
      },
      handler: generateCreditNotePdf,
    });
  },
};
