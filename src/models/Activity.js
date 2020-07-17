const mongoose = require('mongoose');

const ActivitySchema = mongoose.Schema({
  title: { type: String, required: true },
  cards: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card' }],
}, { timestamps: true });

module.exports = mongoose.model('Activity', ActivitySchema);
