const mongoose = require('mongoose');

const BillNumberSchema = mongoose.Schema({
  prefix: String,
  seq: { type: Number, default: 1 }
});

module.exports = mongoose.model('BillNumber', BillNumberSchema);
