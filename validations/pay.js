const Joi = require('joi');

const surchargedHoursValidation = Joi.object().keys({
  hours: Joi.number().required(),
  percentage: Joi.number().required().min(0).max(100),
});

const surchargedDetailsValidation = Joi.object().required().pattern(Joi.string(), {
  planName: Joi.string().required(),
  saturday: surchargedHoursValidation,
  sunday: surchargedHoursValidation,
  publicHoliday: surchargedHoursValidation,
  twentyFifthOfDecember: surchargedHoursValidation,
  firstOfMay: surchargedHoursValidation,
  evening: surchargedHoursValidation,
  custom: surchargedHoursValidation,
});

exports.payValidation = {
  auxiliary: Joi.objectId().required(),
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
  month: Joi.string().required(),
  contractHours: Joi.number().required(),
  workedHours: Joi.number().required(),
  notSurchargedAndNotExempt: Joi.number().required(),
  surchargedAndNotExempt: Joi.number().required(),
  surchargedAndNotExemptDetails: surchargedDetailsValidation,
  notSurchargedAndExempt: Joi.number().required(),
  surchargedAndExempt: Joi.number().required(),
  surchargedAndExemptDetails: surchargedDetailsValidation,
  hoursBalance: Joi.number().required(),
  hoursCounter: Joi.number().required(),
  overtimeHours: Joi.number().required(),
  additionalHours: Joi.number().required(),
  mutual: Joi.boolean().required(),
  transport: Joi.number().required(),
  otherFees: Joi.number().required(),
  bonus: Joi.number().required(),
};
