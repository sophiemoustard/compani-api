const mongoose = require('mongoose');

const PaymentNumberSchema = mongoose.Schema({
  prefix: String,
  seq: { type: Number, default: 0 }
});

module.exports = mongoose.model('PaymentNumber', PaymentNumberSchema);
