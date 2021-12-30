const mongoose = require('mongoose');
const { formatQuery, formatQueryMiddlewareList } = require('./preHooks/validate');

const ActivityHistorySchema = mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  activity: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true },
  date: { type: Date, default: Date.now },
  questionnaireAnswersList: [{
    card: { type: mongoose.Schema.Types.ObjectId, ref: 'Card' },
    answerList: { type: [String] },
  }],
  score: { type: Number },
}, { timestamps: true });

formatQueryMiddlewareList().map(middleware => ActivityHistorySchema.pre(middleware, formatQuery));

module.exports = mongoose.model('ActivityHistory', ActivityHistorySchema);
