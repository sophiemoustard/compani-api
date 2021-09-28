'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  create,
  list,
  update,
  remove,
  generateCreditNotePdf,
} = require('../controllers/creditNoteController');
const {
  getCreditNote,
  authorizeGetCreditNotePdf,
  authorizeCreditNoteCreation,
  authorizeCreditNoteUpdate,
  authorizeCreditNoteDeletion,
} = require('./preHandlers/creditNotes');
const { creditNoteValidations } = require('./validations/creditNote');

exports.plugin = {
  name: 'routes-credit-notes',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      handler: create,
      options: {
        auth: { scope: ['bills:edit'] },
        validate: {
          payload: Joi.object().keys({
            customer: Joi.objectId().required(),
            thirdPartyPayer: Joi.objectId(),
            ...creditNoteValidations,
          }),
        },
        pre: [{ method: authorizeCreditNoteCreation }],
      },
    });

    server.route({
      method: 'GET',
      path: '/',
      handler: list,
      options: {
        auth: { scope: ['bills:read'] },
      },
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}',
      handler: remove,
      options: {
        auth: { scope: ['bills:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        pre: [
          { method: getCreditNote, assign: 'creditNote' },
          { method: authorizeCreditNoteDeletion },
        ],
      },
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      handler: update,
      options: {
        auth: { scope: ['bills:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object().keys({
            ...creditNoteValidations,
          }),
        },
        pre: [
          { method: getCreditNote, assign: 'creditNote' },
          { method: authorizeCreditNoteUpdate },
        ],
      },
    });

    server.route({
      method: 'GET',
      path: '/{_id}/pdfs',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        pre: [
          { method: getCreditNote, assign: 'creditNote' },
          { method: authorizeGetCreditNotePdf },
        ],
      },
      handler: generateCreditNotePdf,
    });
  },
};
