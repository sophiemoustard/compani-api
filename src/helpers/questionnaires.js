const get = require('lodash/get');
const QRCode = require('qrcode');
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
  SELF_POSITIONNING,
  START_COURSE,
  END_COURSE,
} = require('./constants');
const DatesUtilsHelper = require('./dates/utils');
const { CompaniDate } = require('./dates/companiDates');

exports.create = async payload => Questionnaire.create(payload);

exports.list = async (credentials, query = {}) => {
  const isVendorUser = !!get(credentials, 'role.vendor');

  return Questionnaire.find(query).populate({ path: 'historiesCount', options: { isVendorUser } }).lean();
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
  const card = await Card.findOneAndDelete({ _id: cardId }, { 'media.publicId': 1 }).lean();
  await Questionnaire.updateOne({ cards: cardId }, { $pull: { cards: cardId } });
  if (get(card, 'media.publicId')) await CardHelper.deleteMedia(cardId, card.media.publicId);
};

const findQuestionnaires = (questionnaireConditions, historiesConditions) => {
  const { typeList, program } = questionnaireConditions;
  const { courseId, user, timeline } = historiesConditions;

  const findQuestionnaireQuery = {
    type: { $in: typeList },
    $or: [{ program: { $exists: false } }, { program }],
    status: PUBLISHED,
  };

  const matchHistoriesQuery = {
    course: courseId,
    user,
    $or: [{ timeline: { $exists: false } }, { timeline }],
  };

  return Questionnaire
    .find(findQuestionnaireQuery, { type: 1, name: 1 })
    .populate({
      path: 'histories',
      match: matchHistoriesQuery,
      options: { requestingOwnInfos: true },
      select: { _id: 1, timeline: 1 },
    })
    .lean({ virtuals: true });
};

exports.getUserQuestionnaires = async (courseId, credentials) => {
  const course = await Course.findOne({ _id: courseId })
    .populate({ path: 'slots', select: '-__v -createdAt -updatedAt' })
    .populate({ path: 'slotsToPlan', select: '_id' })
    .populate({ path: 'subProgram', select: 'program', populate: { path: 'program', select: '_id' } })
    .lean({ virtuals: true });
  if (course.format === STRICTLY_E_LEARNING) return [];

  const sortedCourseSlots = course.slots.sort(DatesUtilsHelper.ascendingSortBy('startDate'));

  const middleCourseSlotIndex = Math.ceil(sortedCourseSlots.length / 2) - 1;

  const isBeforeMiddleCourse = !sortedCourseSlots.length ||
    CompaniDate().isBefore(sortedCourseSlots[middleCourseSlotIndex].endDate);
  if (isBeforeMiddleCourse) {
    const questionnaires = await findQuestionnaires(
      { typeList: [EXPECTATIONS, SELF_POSITIONNING], program: course.subProgram.program._id },
      { courseId: course._id, user: credentials._id, timeline: START_COURSE }
    );

    return questionnaires.filter(q => q && !q.histories.length);
  }

  if (get(course, 'slotsToPlan.length')) return [];

  const isCourseEnded = sortedCourseSlots.length &&
    CompaniDate().isAfter(sortedCourseSlots[sortedCourseSlots.length - 1].startDate);
  if (isCourseEnded) {
    const questionnaires = await findQuestionnaires(
      { typeList: [END_OF_COURSE, SELF_POSITIONNING], program: course.subProgram.program._id },
      { courseId: course._id, user: credentials._id, timeline: END_COURSE }
    );

    return questionnaires.filter(q => q && !q.histories.length);
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
    .select('type name')
    .populate({
      path: 'histories',
      match: courseId ? { course: courseId } : null,
      options: { isVendorUser },
      select: '-__v -createdAt -updatedAt',
      populate: [
        { path: 'questionnaireAnswersList.card', select: '-__v -createdAt -updatedAt' },
        {
          path: 'course',
          select: 'trainer subProgram',
          populate: { path: 'subProgram', select: 'program', populate: { path: 'program', select: '_id' } },
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

exports.generateQRCode = async (questionnaireId, courseId) => {
  const qrCode = await QRCode
    .toDataURL(
      `${process.env.WEBSITE_HOSTNAME}/ni/questionnaires/${questionnaireId}?courseId=${courseId}`,
      { margin: 0 }
    );

  return qrCode;
};
