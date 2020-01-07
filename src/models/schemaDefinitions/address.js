const mongoose = require('mongoose');

const locationSchemaDefinition = {
  type: { type: String, required: true },
  coordinates: [{ type: Number, required: true }],
};

module.exports = {
  street: { type: String, required: true },
  fullAddress: { type: String, required: true },
  zipCode: { type: String, required: true },
  city: { type: String, required: true },
  location: {
    type: mongoose.Schema(locationSchemaDefinition, { _id: false }),
    required: true,
  },
};
