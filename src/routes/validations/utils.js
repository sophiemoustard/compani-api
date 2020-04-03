const Joi = require('@hapi/joi');
const { MONTH_VALIDATION, PHONE_VALIDATION } = require('../../models/utils');

const monthValidation = Joi.string().regex(new RegExp(MONTH_VALIDATION));
const phoneNumberValidation = Joi.string().regex(new RegExp(PHONE_VALIDATION));

const addressValidation = Joi.object().keys({
  street: Joi.string().required(),
  zipCode: Joi.string().required(),
  city: Joi.string().required(),
  fullAddress: Joi.string().required(),
  location: Joi.object().keys({
    type: Joi.string().required(),
    coordinates: Joi.array().length(2).required(),
  }).required(),
});

const objectIdOrArray = Joi.alternatives().try(Joi.objectId(), Joi.array().items(Joi.objectId()));

module.exports = {
  monthValidation,
  phoneNumberValidation,
  addressValidation,
  objectIdOrArray,
};
