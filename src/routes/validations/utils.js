const Joi = require('joi');
const { MONTH_VALIDATION, PHONE_VALIDATION } = require('../../models/utils');

const monthValidation = Joi.string().regex(MONTH_VALIDATION);
const phoneNumberValidation = Joi.string().regex(PHONE_VALIDATION);

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

const stringOrArray = valid => (valid
  ? Joi.alternatives().try(Joi.string().valid(...valid), Joi.array().items(Joi.string().valid(...valid)))
  : Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string()))
);

const expoTokenValidation = Joi.string().custom((value, helper) => (
  value.substring(0, 18) === 'ExponentPushToken['
    ? value
    : helper.message('Wrong ExponentPushToken type')
));

const formDataPayload = (maxSize = 5242880) => ({
  output: 'stream',
  parse: true,
  multipart: true,
  allow: 'multipart/form-data',
  maxBytes: maxSize,
});

module.exports = {
  monthValidation,
  phoneNumberValidation,
  addressValidation,
  objectIdOrArray,
  stringOrArray,
  expoTokenValidation,
  formDataPayload,
};
