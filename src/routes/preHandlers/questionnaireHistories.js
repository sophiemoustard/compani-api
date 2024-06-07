const Boom = require('@hapi/boom');
const get = require('lodash/get');
const Questionnaire = require('../../models/Questionnaire');
const User = require('../../models/User');
const Course = require('../../models/Course');
const QuestionnaireHistory = require('../../models/QuestionnaireHistory');
const { END_COURSE } = require('../../helpers/constants');
const UtilsHelper = require('../../helpers/utils');
const { checkQuestionnaireAnswersList } = require('./utils');

exports.authorizeAddQuestionnaireHistory = async (req) => {
  const { user: userId, questionnaire: questionnaireId, course: courseId, questionnaireAnswersList } = req.payload;

  const questionnaire = await Questionnaire.countDocuments({ _id: questionnaireId });
  const user = await User.countDocuments({ _id: userId });
  const isCourseFollowedByUser = await Course.countDocuments({ _id: courseId, trainees: userId });

  if (!questionnaire || !user || !isCourseFollowedByUser) throw Boom.notFound();

  if (questionnaireAnswersList) await checkQuestionnaireAnswersList(questionnaireAnswersList, questionnaireId);

  return null;
};

exports.authorizeQuestionnaireHistoryUpdate = async (req) => {
  const { _id: questionnaireHistoryId } = req.params;
  const { trainerAnswers } = req.payload;
  const credentials = get(req, 'auth.credentials');

  const questionnaireHistory = await QuestionnaireHistory
    .findOne(
      { _id: questionnaireHistoryId, timeline: END_COURSE },
      { questionnaire: 1, questionnaireAnswersList: 1, course: 1 }
    )
    .populate({ path: 'course', select: 'trainer' })
    .lean();
  if (!questionnaireHistory) throw Boom.notFound();

  const courseTrainer = questionnaireHistory.course.trainer;
  const loggedUserIsCourseTrainer = UtilsHelper.areObjectIdsEquals(courseTrainer, credentials._id);
  if (!loggedUserIsCourseTrainer) throw Boom.forbidden();

  const cardIds = trainerAnswers.map(answer => answer.card);
  const questionnaire = await Questionnaire
    .findOne({ _id: questionnaireHistory.questionnaire, cards: { $in: cardIds } })
    .lean();
  if (!questionnaire) throw Boom.notFound();

  const answersHasGoodLength = trainerAnswers.length === questionnaireHistory.questionnaireAnswersList.length;
  if (!answersHasGoodLength) throw Boom.badRequest();

  return null;
};
