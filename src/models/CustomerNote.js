const mongoose = require('mongoose');

const CustomerNote = mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, immutable: true, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  company: { type: mongoose.Schema.Types.ObjectId, immutable: true, required: true },
}, { timestamps: true });

module.exports = mongoose.model('CustomerNote', CustomerNote);
