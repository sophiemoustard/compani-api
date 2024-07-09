'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  generateBillPdf,
} = require('../controllers/billsController');
const {
  getBill,
  authorizeGetBillPdf,
} = require('./preHandlers/bills');

exports.plugin = {
  name: 'routes-bill',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/{_id}/pdfs',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        pre: [{ method: getBill, assign: 'bill' }, { method: authorizeGetBillPdf }],
      },
      handler: generateBillPdf,
    });
  },
};
