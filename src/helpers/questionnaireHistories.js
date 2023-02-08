const QuestionnaireHistory = require('../models/QuestionnaireHistory');
const CourseHistoriesHelper = require('./courseHistories');

exports.addQuestionnaireHistory = async (payload) => {
  const traineesCompanyAtCourseRegistrationList = await CourseHistoriesHelper
    .getTraineesCompanyAtCourseRegistration([payload.user], payload.course);
  const traineeCompanyAtCourseRegistration = traineesCompanyAtCourseRegistrationList[0].company;

  return QuestionnaireHistory.create({ ...payload, company: traineeCompanyAtCourseRegistration });
};
