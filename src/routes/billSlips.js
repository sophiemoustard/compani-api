'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { list, generateBillSlipDocx } = require('../controllers/billSlipController');
const { authorizeGetBillSlipDocx } = require('./preHandlers/billSlips');

exports.plugin = {
  name: 'routes-bill-slip',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['bills:edit'] },
      },
      handler: list,
    });

    server.route({
      method: 'GET',
      path: '/{_id}/docx',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        auth: { scope: ['bills:edit'] },
        pre: [{ method: authorizeGetBillSlipDocx }],
      },
      handler: generateBillSlipDocx,
    });
  },
};
