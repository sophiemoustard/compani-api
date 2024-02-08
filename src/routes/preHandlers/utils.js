const Boom = require('@hapi/boom');
const Joi = require('joi');
const get = require('lodash/get');
const Card = require('../../models/Card');
const Activity = require('../../models/Activity');
const Questionnaire = require('../../models/Questionnaire');
const User = require('../../models/User');
const {
  SURVEY,
  OPEN_QUESTION,
  QUESTION_ANSWER,
  VENDOR_ADMIN,
  TRAINING_ORGANISATION_MANAGER,
  TRAINER,
} = require('../../helpers/constants');
const UtilsHelper = require('../../helpers/utils');

exports.checkQuestionnaireAnswersList = async (questionnaireAnswersList, parentId) => {
  const cards = await Card.find({ _id: { $in: questionnaireAnswersList.map(qa => qa.card) } }).lean();
  for (const qa of questionnaireAnswersList) {
    const card = cards.find(c => UtilsHelper.areObjectIdsEquals(c._id, qa.card));
    if (!card) throw Boom.notFound();

    const isNotQuestionnaireTemplate = ![SURVEY, OPEN_QUESTION, QUESTION_ANSWER].includes(card.template);
    const shouldHaveOneAnswer = [SURVEY, OPEN_QUESTION].includes(card.template) ||
      ([QUESTION_ANSWER].includes(card.template) && !card.isQuestionAnswerMultipleChoiced);
    const tooManyAnswers = qa.answerList.length !== 1 && shouldHaveOneAnswer;
    const answerIsNotObjectID = [QUESTION_ANSWER].includes(card.template) &&
      Joi.array().items(Joi.objectId()).validate(qa.answerList).error;

    if (isNotQuestionnaireTemplate || tooManyAnswers || answerIsNotObjectID) throw Boom.badData();

    const activityCount = await Activity.countDocuments({ _id: parentId, cards: card._id });
    const questionnaireCount = await Questionnaire.countDocuments({ _id: parentId, cards: card._id });
    if (!activityCount && !questionnaireCount) throw Boom.notFound();
  }
};

exports.checkVendorUserExistsAndHasRightRole = async (userId, isRofOrAdmin, checkHasTrainerRole = false) => {
  if (!isRofOrAdmin) throw Boom.forbidden();

  const user = await User.findOne({ _id: userId }, { role: 1 }).lean({ autopopulate: true });

  const rolesToCheck = [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER];
  if (checkHasTrainerRole) rolesToCheck.push(TRAINER);

  if (!user || !rolesToCheck.includes(get(user, 'role.vendor.name'))) {
    throw Boom.notFound();
  }

  return null;
};
