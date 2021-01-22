const ActivityHistory = require('../models/ActivityHistory');
const User = require('../models/User');
const { STRICTLY_E_LEARNING } = require('./constants');

exports.addActivityHistory = async payload => ActivityHistory.create(payload);

const filterCourses = activityHistory => ({
  ...activityHistory,
  activity: {
    ...activityHistory.activity,
    steps: activityHistory.activity.steps.map(step => ({
      ...step,
      subProgram: {
        ...step.subProgram,
        courses: step.subProgram.courses.filter(course =>
          course.trainees.map(trainee => trainee.toHexString()).includes(activityHistory.user._id.toHexString())),
      },
    })),
  },
});

const filterSteps = activityHistory => ({
  ...activityHistory,
  activity: {
    ...activityHistory.activity,
    steps: activityHistory.activity.steps.filter(step => step.subProgram.courses.length),
  },
});

exports.list = async (query, credentials) => {
  const users = await User.find({ company: credentials.company._id }, { _id: 1 }).lean();

  const activityHistories = await ActivityHistory
    .find({
      date: { $lte: new Date(query.endDate), $gte: new Date(query.startDate) },
      user: { $in: users.map(u => u._id) },
    })
    .populate([{
      path: 'activity',
      select: '_id',
      populate: {
        path: 'steps',
        select: '_id',
        populate: {
          path: 'subProgram',
          select: '_id',
          populate: [
            { path: 'courses', select: 'misc format trainees', match: { format: STRICTLY_E_LEARNING } },
            { path: 'program', select: 'name' }],
        },
      },
    }, { path: 'user', select: '_id identity picture' }])
    .lean();

  return activityHistories.map(h => filterSteps(filterCourses(h))).filter(h => h.activity.steps.length);
};
