const get = require('lodash/get');
const Questionnaire = require('../models/Questionnaire');
const CardHelper = require('./cards');
const { EXPECTATIONS, PUBLISHED, STRICTLY_E_LEARNING, END_OF_COURSE } = require('./constants');
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

exports.findQuestionnaire = async (course, credentials, type) => Questionnaire
  .findOne({ type, status: PUBLISHED }, { type: 1, name: 1 })
  .populate({ path: 'histories', match: { course: course._id, user: credentials._id } })
  .lean({ virtuals: true });

exports.getUserQuestionnaires = async (course, credentials) => {
  if (course.format === STRICTLY_E_LEARNING) return [];

  const isCourseStarted = get(course, 'slots.length') && DatesHelper.isAfter(Date.now(), course.slots[0].startDate);
  if (!isCourseStarted) {
    const questionnaire = await this.findQuestionnaire(course, credentials, EXPECTATIONS);

    return !questionnaire || questionnaire.histories.length ? [] : [questionnaire];
  }

  if (get(course, 'slotsToPlan.length')) return [];

  const isCourseEnded = get(course, 'slots.length') &&
    DatesHelper.isAfter(Date.now(), course.slots[course.slots.length - 1].endDate);
  if (isCourseEnded) {
    const questionnaire = await this.findQuestionnaire(course, credentials, END_OF_COURSE);

    return !questionnaire || questionnaire.histories.length ? [] : [questionnaire];
  }

  return [];
};
