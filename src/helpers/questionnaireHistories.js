const QuestionnaireHistory = require('../models/QuestionnaireHistory');
const CourseHistoriesHelper = require('./courseHistories');

exports.addQuestionnaireHistory = async (payload) => {
  const traineesCompanyAtCourseRegistrationList = await CourseHistoriesHelper
    .getTraineesCompanyAtCourseRegistration([payload.user], payload.course);

  return QuestionnaireHistory.create({ ...payload, company: traineesCompanyAtCourseRegistrationList[0].company });
};
