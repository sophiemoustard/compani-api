const Boom = require('@hapi/boom');
const Joi = require('joi');
const get = require('lodash/get');
const has = require('lodash/has');
const Activity = require('../../models/Activity');
const User = require('../../models/User');
const Course = require('../../models/Course');
const Card = require('../../models/Card');
const { SURVEY, OPEN_QUESTION, QUESTION_ANSWER } = require('../../helpers/constants');

exports.checkQuestionnaireAnswersList = async (questionnaireAnswersList, activityId) => {
  for (const qa of questionnaireAnswersList) {
    const card = await Card.findOne({ _id: qa.card }).lean();
    if (!card) throw Boom.notFound();

    const isNotQuestionnaireTemplate = ![SURVEY, OPEN_QUESTION, QUESTION_ANSWER].includes(card.template);
    const tooManyAnswers = ([SURVEY, OPEN_QUESTION].includes(card.template) && qa.answerList.length !== 1) ||
      ([QUESTION_ANSWER].includes(card.template) &&
        (!card.isQuestionAnswerMultipleChoiced && qa.answerList.length !== 1));
    const answerIsNotObjectID = [QUESTION_ANSWER].includes(card.template) &&
      Joi.array().items(Joi.objectId()).validate(qa.answerList).error;

    if (isNotQuestionnaireTemplate || tooManyAnswers || answerIsNotObjectID) throw Boom.badData();

    const activityCount = await Activity.countDocuments({ _id: activityId, cards: card._id });
    if (!activityCount) throw Boom.notFound();
  }
};

exports.authorizeAddActivityHistory = async (req) => {
  const { user: userId, activity: activityId, questionnaireAnswersList } = req.payload;

  const activity = await Activity
    .findOne({ _id: activityId })
    .populate({
      path: 'steps',
      select: '_id -activities',
      populate: { path: 'subProgram', select: '_id -steps' },
    })
    .lean();
  const user = await User.findOne({ _id: userId }).lean();

  if (!activity || !user) throw Boom.notFound();

  const activitySubPrograms = activity.steps.filter(s => has(s, 'subProgram._id')).map(s => s.subProgram._id);
  const coursesWithActivityAndFollowedByUser = await Course
    .countDocuments({ subProgram: { $in: activitySubPrograms }, trainees: userId });

  if (!coursesWithActivityAndFollowedByUser) throw Boom.notFound();

  if (questionnaireAnswersList) await this.checkQuestionnaireAnswersList(questionnaireAnswersList, activityId);

  return null;
};

exports.authorizeHistoriesList = async (req) => {
  const company = get(req, 'auth.credentials.company._id');
  if (!company) return Boom.forbidden();

  return null;
};
