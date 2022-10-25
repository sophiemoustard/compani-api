const mongoose = require('mongoose');
const { formatQuery, queryMiddlewareList } = require('./preHooks/validate');

const QuestionnaireHistorySchema = mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questionnaire: { type: mongoose.Schema.Types.ObjectId, ref: 'Questionnaire', required: true },
  questionnaireAnswersList: [{
    card: { type: mongoose.Schema.Types.ObjectId, ref: 'Card' },
    answerList: { type: [String] },
  }],
}, { timestamps: true });

queryMiddlewareList.map(middleware => QuestionnaireHistorySchema.pre(middleware, formatQuery));

module.exports = mongoose.model('QuestionnaireHistory', QuestionnaireHistorySchema);
