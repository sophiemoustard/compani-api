const mongoose = require('mongoose');
const {
  formatQuery,
  queryMiddlewareList,
  getDocMiddlewareList,
  getDocListMiddlewareList,
} = require('./preHooks/validate');
const { formatSecondsToISODuration } = require('../helpers/dates/utils');

const ActivityHistorySchema = mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  activity: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true },
  date: { type: Date, default: Date.now },
  questionnaireAnswersList: [{
    card: { type: mongoose.Schema.Types.ObjectId, ref: 'Card' },
    answerList: { type: [String] },
  }],
  score: { type: Number },
  duration: { type: Number },
}, { timestamps: true });

function formatDuration(doc, next) {
  // eslint-disable-next-line no-param-reassign
  if (doc && doc.duration) doc.duration = formatSecondsToISODuration(doc.duration);

  return next();
}

function formatDurationList(docs, next) {
  for (const doc of docs) {
    formatDuration(doc, next);
  }

  return next();
}

getDocMiddlewareList.map(middleware => ActivityHistorySchema.post(middleware, formatDuration));
getDocListMiddlewareList.map(middleware => ActivityHistorySchema.post(middleware, formatDurationList));
queryMiddlewareList.map(middleware => ActivityHistorySchema.pre(middleware, formatQuery));

module.exports = mongoose.model('ActivityHistory', ActivityHistorySchema);
