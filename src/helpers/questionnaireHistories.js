const Boom = require('@hapi/boom');
const QuestionnaireHistory = require('../models/QuestionnaireHistory');
const Questionnaire = require('../models/Questionnaire');
const Course = require('../models/Course');
const { COURSE, TRAINEE, SELF_POSITIONNING, DAY, START_COURSE, END_COURSE } = require('./constants');
const CourseHistoriesHelper = require('./courseHistories');
const DatesUtilsHelper = require('./dates/utils');
const { CompaniDate } = require('./dates/companiDates');
const translate = require('./translate');

const { language } = translate;

exports.addQuestionnaireHistory = async (payload) => {
  const { user: userId, questionnaire: questionnaireId, course: courseId } = payload;
  const traineesCompanyAtCourseRegistrationList = await CourseHistoriesHelper.getCompanyAtCourseRegistrationList(
    { key: COURSE, value: payload.course }, { key: TRAINEE, value: [payload.user] }
  );

  const questionnaire = await Questionnaire.findOne({ _id: questionnaireId }, { type: 1 }).lean();
  let qhPayload = { ...payload, company: traineesCompanyAtCourseRegistrationList[0].company };

  let timeline = '';
  if (questionnaire.type === SELF_POSITIONNING) {
    const course = await Course.findOne({ _id: courseId })
      .populate({ path: 'slots', select: '-__v -createdAt -updatedAt' })
      .populate({ path: 'slotsToPlan', select: '_id' })
      .populate({ path: 'subProgram', select: 'program', populate: { path: 'program', select: '_id' } })
      .lean();

    const sortedCourseSlots = course.slots.sort(DatesUtilsHelper.ascendingSortBy('startDate'));

    const middleCourseSlotIndex = Math.ceil(sortedCourseSlots.length / 2) - 1;
    const isBeforeMiddleCourse = CompaniDate().isBefore(sortedCourseSlots[middleCourseSlotIndex].endDate);
    const lastSlotStartOfDay = CompaniDate(sortedCourseSlots[sortedCourseSlots.length - 1].startDate).startOf(DAY);

    if (isBeforeMiddleCourse) {
      timeline = START_COURSE;
    } else if (CompaniDate().isAfter(lastSlotStartOfDay)) {
      timeline = END_COURSE;
    } else {
      throw Boom.forbidden();
    }

    qhPayload = { ...qhPayload, timeline };
  }

  const questionnaireHistoryExists = await QuestionnaireHistory
    .countDocuments({ course: courseId, user: userId, ...(timeline && { timeline }) });
  if (questionnaireHistoryExists) throw Boom.conflict(translate[language].questionnaireHistoryConflict);

  return QuestionnaireHistory.create(qhPayload);
};
