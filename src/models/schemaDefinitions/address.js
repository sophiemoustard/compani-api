module.exports = {
  street: String,
  fullAddress: String,
  zipCode: String,
  city: String,
  location: {
    type: { type: String },
    coordinates: [Number],
  },
};
