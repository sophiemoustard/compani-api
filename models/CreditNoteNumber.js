const mongoose = require('mongoose');

const CreditNoteNumberSchema = mongoose.Schema({
  creditNoteNumber: {
    prefix: String,
    seq: {
      type: Number,
      default: 0
    }
  }
});

module.exports = mongoose.model('CreditNoteNumber', CreditNoteNumberSchema);
