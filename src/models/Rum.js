const mongoose = require('mongoose');

const RumSchema = mongoose.Schema({
  prefix: String,
  seq: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model('Rum', RumSchema);
