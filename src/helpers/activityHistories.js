const ActivityHistory = require('../models/ActivityHistory');

exports.addActivityHistory = async payload => ActivityHistory.create(payload);

exports.getActivityHistory = async (activityId) => {
  const activityHistories = await ActivityHistory
    .find({ activity: activityId }, 'user activity date questionnaireAnswersList')
    .sort([['date', -1]])
    .lean();

  return activityHistories[0];
};
