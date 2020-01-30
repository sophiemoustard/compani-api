const Joi = require('joi');

const monthValidation = Joi.string().regex(new RegExp(/^([0]{1}[1-9]{1}|[1]{1}[0-2]{1})-[2]{1}[0]{1}[0-9]{2}$/));

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
  addressValidation,
  objectIdOrArray,
};
