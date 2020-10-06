const mongoose = require('mongoose');

const ActivityHistorySchema = mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  activity: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true },
  date: { type: Date, default: Date.now },
  questionnaireAnswersList: [{ card: { type: mongoose.Schema.Types.ObjectId, ref: 'Card' }, answer: { type: String } }],
}, { timestamps: true });

module.exports = mongoose.model('ActivityHistory', ActivityHistorySchema);
