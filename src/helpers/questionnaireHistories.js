const QuestionnaireHistory = require('../models/QuestionnaireHistory');

exports.addQuestionnaireHistory = async payload => QuestionnaireHistory.create(payload);
