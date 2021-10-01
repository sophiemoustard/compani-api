const Joi = require('joi');

exports.fundingValidation = {
  folderNumber: Joi.string(),
  startDate: Joi.date().required(),
  endDate: Joi.date().min(Joi.ref('startDate')).allow(''),
  amountTTC: Joi.number().min(0),
  unitTTCRate: Joi.number().min(0),
  careHours: Joi.number().min(0),
  careDays: Joi.array().items(Joi.number().min(0).max(7)).required(),
  customerParticipationRate: Joi.number().min(0).max(100),
};
