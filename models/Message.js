const mongoose = require('mongoose');

const MessageSchema = mongoose.Schema({
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

module.exports = mongoose.model('Message', MessageSchema);
