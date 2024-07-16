'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  generateCreditNotePdf,
} = require('../controllers/creditNoteController');
const {
  getCreditNote,
  authorizeGetCreditNotePdf,
} = require('./preHandlers/creditNotes');

exports.plugin = {
  name: 'routes-credit-notes',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/{_id}/pdfs',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        pre: [{ method: getCreditNote, assign: 'creditNote' }, { method: authorizeGetCreditNotePdf }],
      },
      handler: generateCreditNotePdf,
    });
  },
};
