module.exports = {
  street: { type: String, required: true },
  fullAddress: { type: String, required: true },
  zipCode: { type: String, required: true },
  city: { type: String, required: true },
  location: {
    type: { type: String, required: true },
    coordinates: [{ type: Number, required: true }],
  },
};
