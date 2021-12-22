const mongoose = require('mongoose');
const { formatQuery } = require('./preHooks/validate');

const QuestionnaireHistorySchema = mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questionnaire: { type: mongoose.Schema.Types.ObjectId, ref: 'Questionnaire', required: true },
  questionnaireAnswersList: [{
    card: { type: mongoose.Schema.Types.ObjectId, ref: 'Card' },
    answerList: { type: [String] },
  }],
}, { timestamps: true });

QuestionnaireHistorySchema.pre('countDocuments', formatQuery);
QuestionnaireHistorySchema.pre('find', formatQuery);
QuestionnaireHistorySchema.pre('findOne', formatQuery);

module.exports = mongoose.model('QuestionnaireHistory', QuestionnaireHistorySchema);
