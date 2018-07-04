const mongoose = require('mongoose');

const MessageToBotSchema = mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  content: String,
  sectors: [String],
  recipients: {
    type: Array,
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.model('MessageToBot', MessageToBotSchema);
