const Boom = require('@hapi/boom');
const QuestionnaireHistory = require('../models/QuestionnaireHistory');
const Questionnaire = require('../models/Questionnaire');
const {
  COURSE,
  TRAINEE,
  SELF_POSITIONNING,
  START_COURSE,
  END_COURSE,
  BEFORE_MIDDLE_COURSE_END_DATE,
  ENDED,
  UNKNOWN,
} = require('./constants');
const CourseHistoriesHelper = require('./courseHistories');
const QuestionnaireHelper = require('./questionnaires');
const translate = require('./translate');

const { language } = translate;

exports.addQuestionnaireHistory = async (payload) => {
  const { user: userId, questionnaire: questionnaireId, course: courseId } = payload;
  const traineesCompanyAtCourseRegistrationList = await CourseHistoriesHelper
    .getCompanyAtCourseRegistrationList({ key: COURSE, value: courseId }, { key: TRAINEE, value: [userId] });

  const questionnaire = await Questionnaire.findOne({ _id: questionnaireId }, { type: 1 }).lean();

  let timeline;
  if (questionnaire.type === SELF_POSITIONNING) {
    const { courseTimeline } = await QuestionnaireHelper.getCourseInfos(courseId);

    switch (courseTimeline) {
      case BEFORE_MIDDLE_COURSE_END_DATE:
        timeline = START_COURSE;
        break;
      case ENDED:
        timeline = END_COURSE;
        break;
      default:
        timeline = UNKNOWN;
    }
  }

  const questionnaireHistoryExists = await QuestionnaireHistory
    .countDocuments({ course: courseId, user: userId, questionnaire: questionnaireId, ...(timeline && { timeline }) });
  if (questionnaireHistoryExists) throw Boom.conflict(translate[language].questionnaireHistoryConflict);

  return QuestionnaireHistory.create(
    { ...payload, company: traineesCompanyAtCourseRegistrationList[0].company, ...(timeline && { timeline }) }
  );
};

exports.updateQuestionnaireHistory = async questionnaireHistoryId => QuestionnaireHistory
  .updateOne({ _id: questionnaireHistoryId }, { $set: { isValidated: true } });
