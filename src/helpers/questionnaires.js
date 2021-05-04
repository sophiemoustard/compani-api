const get = require('lodash/get');
const Questionnaire = require('../models/Questionnaire');
const Course = require('../models/Course');
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

exports.getUserQuestionnaires = async (course, credentials) => {
  const isCourseStarted = get(course, 'slots.length') && DatesHelper.isAfter(Date.now(), course.slots[0].startDate);
  if (course.format === STRICTLY_E_LEARNING || isCourseStarted) return [];

  const questionnaire = await Questionnaire.findOne({ type: EXPECTATIONS, status: PUBLISHED }, { type: 1, name: 1 })
    .populate({ path: 'histories', match: { course: course._id, user: credentials._id } })
    .lean({ virtuals: true });

  return !questionnaire || questionnaire.histories.length ? [] : [questionnaire];
};

exports.getFollowUp = async (id, courseId) => {
  const course = await Course.findOne({ _id: courseId })
    .select('subProgram company misc')
    .populate({ path: 'subProgram', select: 'program', populate: [{ path: 'program', select: 'name' }] })
    .populate({ path: 'company', select: 'name' })
    .lean();

  const questionnaire = await Questionnaire.findOne({ _id: id })
    .select('type name')
    .populate({
      path: 'histories',
      match: { course: courseId },
      populate: { path: 'questionnaireAnswersList.card', select: '-createdAt -updatedAt' },
    })
    .lean();

  const followUp = {};
  for (const history of questionnaire.histories) {
    for (const answer of history.questionnaireAnswersList) {
      const { answerList } = answer;
      if (answerList.length === 1 && !answerList[0].trim()) continue;

      if (!followUp[answer.card._id]) followUp[answer.card._id] = { ...answer.card, answers: [] };
      followUp[answer.card._id].answers.push(...answerList);
    }
  }

  return {
    course: {
      programName: course.subProgram.program.name,
      companyName: course.company.name,
      misc: course.misc,
    },
    questionnaire: { type: questionnaire.type, name: questionnaire.name },
    followUp: Object.values(followUp),
  };
};
