const Joi = require('joi');
const {
  authorizeCustomerAbsenceGet,
  authorizeCustomerAbsenceUpdate,
  authorizeCustomerAbsenceDeletion,
} = require('./preHandlers/customerAbsences');
const { list, update, remove } = require('../controllers/customerAbsenceController');
const { objectIdOrArray } = require('./validations/utils');
const { CUSTOMER_ABSENCE_TYPE } = require('../models/CustomerAbsence');

exports.plugin = {
  name: 'routes-customer-absences',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['events:read', 'customer-{query.customer}'] },
        validate: {
          query: Joi.object({
            customer: objectIdOrArray.required(),
            startDate: Joi.date().required(),
            endDate: Joi.date().greater(Joi.ref('startDate')).required(),
          }),
        },
        pre: [{ method: authorizeCustomerAbsenceGet }],
      },
      handler: list,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        auth: { scope: ['events:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object().keys({
            startDate: Joi.date(),
            endDate: Joi.date().greater(Joi.ref('startDate')),
            absenceType: Joi.string().valid(...CUSTOMER_ABSENCE_TYPE),
          }),
        },
        pre: [{ method: authorizeCustomerAbsenceUpdate }],
      },
      handler: update,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}',
      options: {
        auth: { scope: ['events:edit'] },
        validate: { params: Joi.object({ _id: Joi.objectId().required() }) },
        pre: [{ method: authorizeCustomerAbsenceDeletion }],
      },
      handler: remove,
    });
  },
};
