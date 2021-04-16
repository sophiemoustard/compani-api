const get = require('lodash/get');
const Questionnaire = require('../models/Questionnaire');
const CardHelper = require('./cards');
const { EXPECTATIONS, PUBLISHED, STRICTLY_E_LEARNING } = require('./constants');
const DatesHelper = require('./dates');

exports.create = async payload => Questionnaire.create(payload);

exports.list = async () => Questionnaire.find().lean();

exports.getQuestionnaire = async id => Questionnaire.findOne({ _id: id })
  .populate({ path: 'cards', select: '-__v -createdAt -updatedAt' })
  .lean({ virtuals: true });

exports.update = async (id, payload) => Questionnaire.findOneAndUpdate({ _id: id }, { $set: payload }).lean();

exports.addCard = async (questionnaireId, payload) => {
  const card = await CardHelper.createCard(payload);
  await Questionnaire.updateOne({ _id: questionnaireId }, { $push: { cards: card._id } });
};

exports.removeCard = async (cardId) => {
  await Questionnaire.updateOne({ cards: cardId }, { $pull: { cards: cardId } });
  await CardHelper.removeCard(cardId);
};

exports.getUserQuestionnaires = async (course) => {
  const isCourseStarted = get(course, 'slots.length') && DatesHelper.isAfter(Date.now(), course.slots[0].startDate);
  if (course.format === STRICTLY_E_LEARNING || isCourseStarted) return [];

  const questionnaire = await Questionnaire.findOne({ type: EXPECTATIONS, status: PUBLISHED }, { type: 1, title: 1 })
    .lean();

  return questionnaire ? [questionnaire] : [];
};
