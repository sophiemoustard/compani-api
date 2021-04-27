const Boom = require('@hapi/boom');
const Questionnaire = require('../../models/Questionnaire');
const User = require('../../models/User');
const Course = require('../../models/Course');
const QuestionnaireHistory = require('../../models/QuestionnaireHistory');
const { checkQuestionnaireAnswersList } = require('./utils');

exports.authorizeAddQuestionnaireHistory = async (req) => {
  const { user: userId, questionnaire: questionnaireId, course: courseId, questionnaireAnswersList } = req.payload;

  const questionnaire = await Questionnaire.countDocuments({ _id: questionnaireId });
  const user = await User.countDocuments({ _id: userId });
  const isCourseFollowedByUser = await Course.countDocuments({ _id: courseId, trainees: userId });

  if (!questionnaire || !user || !isCourseFollowedByUser) throw Boom.notFound();

  const questionnaireHistory = await QuestionnaireHistory
    .countDocuments({ course: courseId, user: userId, questionnaire: questionnaireId });
  if (questionnaireHistory) return Boom.conflict();

  if (questionnaireAnswersList) await checkQuestionnaireAnswersList(questionnaireAnswersList, questionnaireId);

  return null;
};
