'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const { create } = require('../controllers/coursePaymentController');
const { authorizeCoursePaymentCreation } = require('./preHandlers/coursePayments');
const { PAYMENT_NATURES } = require('../models/Payment');
const { COURSE_PAYMENT_TYPES } = require('../models/CoursePayment');
const { requiredDateToISOString } = require('./validations/utils');

exports.plugin = {
  name: 'routes-course-payments',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        auth: { scope: ['config:vendor'] },
        validate: {
          payload: Joi.object({
            date: requiredDateToISOString.required(),
            courseBill: Joi.objectId().required(),
            company: Joi.objectId().required(),
            netInclTaxes: Joi.number().min(0).required(),
            nature: Joi.string().valid(...PAYMENT_NATURES).required(),
            type: Joi.string().valid(...COURSE_PAYMENT_TYPES).required(),
          }),
        },
        pre: [{ method: authorizeCoursePaymentCreation }],
      },
      handler: create,
    });
  },
};
