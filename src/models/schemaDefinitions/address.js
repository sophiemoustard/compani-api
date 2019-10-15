const locationSchemaDefinition = require('./location');

module.exports = {
  street: String,
  fullAddress: String,
  zipCode: String,
  city: String,
  location: locationSchemaDefinition,
};
