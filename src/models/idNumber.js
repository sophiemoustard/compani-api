const mongoose = require('mongoose');

const IdNumberSchema = mongoose.Schema({
  idNumber: {
    prefix: String,
    seq: {
      type: Number,
      default: 0
    }
  }
});

module.exports = mongoose.model('IdNumber', IdNumberSchema);
