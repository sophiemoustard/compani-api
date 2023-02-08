const mongoose = require('mongoose');
const { validateQuery, validateAggregation, formatQuery, queryMiddlewareList } = require('./preHooks/validate');

const QuestionnaireHistorySchema = mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questionnaire: { type: mongoose.Schema.Types.ObjectId, ref: 'Questionnaire', required: true },
  questionnaireAnswersList: [{
    card: { type: mongoose.Schema.Types.ObjectId, ref: 'Card' },
    answerList: { type: [String] },
  }],
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
}, { timestamps: true });

QuestionnaireHistorySchema.pre('find', validateQuery);
QuestionnaireHistorySchema.pre('aggregate', validateAggregation);
queryMiddlewareList.map(middleware => QuestionnaireHistorySchema.pre(middleware, formatQuery));

module.exports = mongoose.model('QuestionnaireHistory', QuestionnaireHistorySchema);
