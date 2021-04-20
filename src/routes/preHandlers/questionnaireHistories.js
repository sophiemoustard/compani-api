const Boom = require('@hapi/boom');
const Joi = require('joi');
const Questionnaire = require('../../models/Questionnaire');
const User = require('../../models/User');
const Course = require('../../models/Course');
const Card = require('../../models/Card');
const QuestionnaireHistory = require('../../models/QuestionnaireHistory');
const { SURVEY, OPEN_QUESTION, QUESTION_ANSWER } = require('../../helpers/constants');

exports.checkQuestionnaireAnswersList = async (questionnaireAnswersList, questionnaireId) => {
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

    const questionnaireCount = await Questionnaire.countDocuments({ _id: questionnaireId, cards: card._id });
    if (!questionnaireCount) throw Boom.notFound();
  }
};

exports.authorizeAddQuestionnaireHistory = async (req) => {
  const { user: userId, questionnaire: questionnaireId, course: courseId, questionnaireAnswersList } = req.payload;

  const questionnaire = await Questionnaire.countDocuments({ _id: questionnaireId });
  const user = await User.countDocuments({ _id: userId });
  const isCourseFollowedByUser = await Course.countDocuments({ _id: courseId, trainees: userId });

  if (!questionnaire || !user || !isCourseFollowedByUser) throw Boom.notFound();

  const questionnaireHistory = await QuestionnaireHistory
    .countDocuments({ course: courseId, user: userId, questionnaire: questionnaireId });
  if (questionnaireHistory) return Boom.forbidden();

  if (questionnaireAnswersList) await this.checkQuestionnaireAnswersList(questionnaireAnswersList, questionnaireId);

  return null;
};
