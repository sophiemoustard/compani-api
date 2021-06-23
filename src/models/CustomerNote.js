const mongoose = require('mongoose');
const { validateQuery } = require('./preHooks/validate');

const CustomerNoteSchema = mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, immutable: true, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  company: { type: mongoose.Schema.Types.ObjectId, immutable: true, required: true },
}, { timestamps: true });

CustomerNoteSchema.pre('find', validateQuery);

module.exports = mongoose.model('CustomerNote', CustomerNoteSchema);
