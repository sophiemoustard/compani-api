const mongoose = require('mongoose');

const ActivityHistorySchema = mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, required: true },
  activity: { type: mongoose.Schema.Types.ObjectId, required: true },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ActivityHistory', ActivityHistorySchema);
