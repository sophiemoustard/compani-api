const QuestionnaireHistory = require('../models/QuestionnaireHistory');
const { COURSE, TRAINEE } = require('./constants');
const CourseHistoriesHelper = require('./courseHistories');

exports.addQuestionnaireHistory = async (payload) => {
  const traineesCompanyAtCourseRegistrationList = await CourseHistoriesHelper.getCompanyAtCourseRegistrationList(
    { key: COURSE, value: payload.course }, { key: TRAINEE, value: [payload.user] }
  );

  return QuestionnaireHistory.create({ ...payload, company: traineesCompanyAtCourseRegistrationList[0].company });
};
