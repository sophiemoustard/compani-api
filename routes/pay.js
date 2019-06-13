'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  draftPayList,
  createList,
} = require('../controllers/payController');

exports.plugin = {
  name: 'routes-pay',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/draft',
      options: {
        auth: { strategy: 'jwt' },
        validate: {
          query: {
            endDate: Joi.date(),
            startDate: Joi.date(),
          },
        },
      },
      handler: draftPayList,
    });

    const validateSurchargedHours = Joi.object().keys({
      hours: Joi.number().required(),
      percentage: Joi.number().required().min(0).max(100),
    });

    const validateSurchargedDetails = Joi.object().required().pattern(Joi.string(), {
      planName: Joi.string().required(),
      saturday: validateSurchargedHours,
      sunday: validateSurchargedHours,
      publicHoliday: validateSurchargedHours,
      twentyFifthOfDecember: validateSurchargedHours,
      firstOfMay: validateSurchargedHours,
      evening: validateSurchargedHours,
      custom: validateSurchargedHours,
    });

    server.route({
      method: 'POST',
      path: '/',
      options: {
        auth: { strategy: 'jwt' },
        validate: {
          payload: Joi.array().items(Joi.object({
            auxiliary: Joi.objectId().required(),
            startDate: Joi.date().required(),
            endDate: Joi.date().required(),
            month: Joi.string().required(),
            contractHours: Joi.number().required(),
            workedHours: Joi.number().required(),
            notSurchargedAndNotExempt: Joi.number().required(),
            surchargedAndNotExempt: Joi.number().required(),
            surchargedAndNotExemptDetails: validateSurchargedDetails,
            notSurchargedAndExempt: Joi.number().required(),
            surchargedAndExempt: Joi.number().required(),
            surchargedAndExemptDetails: validateSurchargedDetails,
            hoursBalance: Joi.number().required(),
            hoursCounter: Joi.number().required(),
            overtimeHours: Joi.number().required(),
            additionalHours: Joi.number().required(),
            mutual: Joi.boolean().required(),
            transport: Joi.number().required(),
            otherFees: Joi.number().required(),
            bonus: Joi.number().required(),
          })),
        },
      },
      handler: createList,
    });
  },
};
