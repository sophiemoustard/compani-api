const Boom = require('@hapi/boom');
const get = require('lodash/get');
const Questionnaire = require('../../models/Questionnaire');
const User = require('../../models/User');
const Card = require('../../models/Card');
const Course = require('../../models/Course');
const QuestionnaireHistory = require('../../models/QuestionnaireHistory');
const { END_COURSE } = require('../../helpers/constants');
const { areObjectIdsEquals } = require('../../helpers/utils');
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

  const loggedUserIsCourseTrainer = areObjectIdsEquals(questionnaireHistory.course.trainer, credentials._id);
  if (!loggedUserIsCourseTrainer) throw Boom.forbidden();

  const cardIds = trainerAnswers.map(answer => answer.card);
  const questionnaire = await Questionnaire
    .findOne({ _id: questionnaireHistory.questionnaire, cards: { $in: cardIds } })
    .lean();
  if (!questionnaire) throw Boom.notFound();

  const answersHaGoodLength = trainerAnswers.length === questionnaireHistory.questionnaireAnswersList.length;
  if (!answersHaGoodLength) throw Boom.badRequest();

  for (const answer of trainerAnswers) {
    const card = await Card.findOne({ _id: answer.card }, { labels: 1 }).lean();
    if (!card) throw Boom.notFound();
  }

  return null;
};
