const mongoose = require('mongoose');

const QuoteNumberSchema = mongoose.Schema({
  quoteNumber: {
    prefix: String,
    seq: {
      type: Number,
      default: 0
    }
  }
});

module.exports = mongoose.model('QuoteNumber', QuoteNumberSchema);
