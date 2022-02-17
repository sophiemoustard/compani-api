const Joi = require('joi');

exports.billingItemListValidations = {
  billingItemList: Joi.array().items(Joi.object({
    billingItem: Joi.objectId().required(),
    unitInclTaxes: Joi.number().required(),
    count: Joi.number().min(1).required(),
  })),
};
