const get = require('lodash/get');
const Questionnaire = require('../models/Questionnaire');
const Course = require('../models/Course');
const Card = require('../models/Card');
const CardHelper = require('./cards');
const {
  EXPECTATIONS,
  PUBLISHED,
  STRICTLY_E_LEARNING,
  END_OF_COURSE,
  INTRA,
  TRAINING_ORGANISATION_MANAGER,
  VENDOR_ADMIN,
} = require('./constants');
const DatesUtilsHelper = require('./dates/utils');
const { CompaniDate } = require('./dates/companiDates');

exports.create = async payload => Questionnaire.create(payload);

exports.list = async (credentials) => {
  const isRofOrAdmin = [TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN].includes(get(credentials, 'role.vendor.name'));

  return Questionnaire.find().populate({ path: 'historiesCount', options: { isVendorUser: isRofOrAdmin } }).lean();
};

exports.getQuestionnaire = async id => Questionnaire.findOne({ _id: id })
  .populate({ path: 'cards', select: '-__v -createdAt -updatedAt' })
  .lean({ virtuals: true });

exports.update = async (id, payload) => Questionnaire.findOneAndUpdate({ _id: id }, { $set: payload }).lean();

exports.addCard = async (questionnaireId, payload) => {
  const card = await CardHelper.createCard(payload);
  await Questionnaire.updateOne({ _id: questionnaireId }, { $push: { cards: card._id } });
};

exports.removeCard = async (cardId) => {
  const card = await Card.findOneAndRemove({ _id: cardId }, { 'media.publicId': 1 }).lean();
  await Questionnaire.updateOne({ cards: cardId }, { $pull: { cards: cardId } });
  if (get(card, 'media.publicId')) await CardHelper.deleteMedia(cardId, card.media.publicId);
};

exports.findQuestionnaire = async (course, credentials, type) => Questionnaire
  .findOne({ type, status: PUBLISHED }, { type: 1, name: 1 })
  .populate({
    path: 'histories',
    match: { course: course._id, user: credentials._id },
    options: { requestingOwnInfos: true },
  })
  .lean({ virtuals: true });

exports.getUserQuestionnaires = async (courseId, credentials) => {
  const course = await Course.findOne({ _id: courseId })
    .populate({ path: 'slots', select: '-__v -createdAt -updatedAt' })
    .populate({ path: 'slotsToPlan', select: '_id' })
    .lean({ virtuals: true });

  if (course.format === STRICTLY_E_LEARNING) return [];

  const sortedCourseSlots = course.slots.sort(DatesUtilsHelper.ascendingSortBy('startDate'));
  const isCourseStarted = sortedCourseSlots.length && CompaniDate().isAfter(sortedCourseSlots[0].startDate);
  if (!isCourseStarted) {
    const questionnaire = await this.findQuestionnaire(course, credentials, EXPECTATIONS);

    return !questionnaire || questionnaire.histories.length ? [] : [questionnaire];
  }

  if (get(course, 'slotsToPlan.length')) return [];

  const isCourseEnded = sortedCourseSlots.length &&
    CompaniDate().isAfter(sortedCourseSlots[sortedCourseSlots.length - 1].startDate);
  if (isCourseEnded) {
    const questionnaire = await this.findQuestionnaire(course, credentials, END_OF_COURSE);

    return !questionnaire || questionnaire.histories.length ? [] : [questionnaire];
  }

  return [];
};

const formatQuestionnaireAnswersWithCourse = async (courseId, questionnaireAnswers) => {
  const course = await Course.findOne({ _id: courseId })
    .select('subProgram companies misc type')
    .populate({ path: 'subProgram', select: 'program', populate: [{ path: 'program', select: 'name' }] })
    .populate({ path: 'companies', select: 'name' })
    .lean();

  return {
    ...questionnaireAnswers,
    course: {
      programName: course.subProgram.program.name,
      companyName: course.type === INTRA ? course.companies[0].name : '',
      misc: course.misc,
    },
  };
};

exports.getFollowUp = async (id, courseId, credentials) => {
  const isVendorUser = !!get(credentials, 'role.vendor');
  const questionnaire = await Questionnaire.findOne({ _id: id })
    .select('type name company')
    .populate({
      path: 'histories',
      match: courseId ? { course: courseId } : null,
      options: { isVendorUser },
      populate: [
        { path: 'questionnaireAnswersList.card', select: '-createdAt -updatedAt' },
        {
          path: 'course',
          select: 'trainer subProgram',
          populate: [
            { path: 'trainer', select: 'identity' },
            { path: 'subProgram', select: 'program', populate: { path: 'program', select: '_id -subPrograms' } },
          ],
        },
      ],
    })
    .lean();

  const followUp = {};
  for (const history of questionnaire.histories) {
    for (const answer of history.questionnaireAnswersList) {
      const { answerList } = answer;
      if (answerList.length === 1 && !answerList[0].trim()) continue;

      if (!followUp[answer.card._id]) followUp[answer.card._id] = { ...answer.card, answers: [] };
      followUp[answer.card._id].answers
        .push(...answerList.map(a => ({ answer: a, course: history.course, traineeCompany: history.company })));
    }
  }

  const questionnaireAnswers = {
    questionnaire: { type: questionnaire.type, name: questionnaire.name },
    followUp: Object.values(followUp),
  };

  return courseId ? formatQuestionnaireAnswersWithCourse(courseId, questionnaireAnswers) : questionnaireAnswers;
};
