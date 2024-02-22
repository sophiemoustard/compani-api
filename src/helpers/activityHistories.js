const has = require('lodash/has');
const get = require('lodash/get');
const ActivityHistory = require('../models/ActivityHistory');
const UserCompany = require('../models/UserCompany');
const { STRICTLY_E_LEARNING } = require('./constants');
const UtilsHelper = require('./utils');
const { CompaniDuration } = require('./dates/companiDurations');

exports.addActivityHistory = async payload => ActivityHistory
  .create({ ...payload, duration: CompaniDuration(payload.duration).asSeconds() });

const filterCourses = activityHistory => ({
  ...activityHistory,
  activity: {
    ...activityHistory.activity,
    steps: activityHistory.activity.steps.map(step => ({
      ...step,
      subPrograms: step.subPrograms.map(subProgram => ({
        ...subProgram,
        ...(subProgram.courses && {
          courses: subProgram.courses.filter(c => UtilsHelper.doesArrayIncludeId(c.trainees, activityHistory.user._id)),
        }),
      })),
    })),
  },
});

const filterSteps = activityHistory => ({
  ...activityHistory,
  activity: {
    ...activityHistory.activity,
    steps: activityHistory.activity.steps.filter(step => step.subPrograms.some(sp => get(sp, 'courses.length'))),
  },
});

exports.list = async (query, credentials) => {
  const userCompanies = await UserCompany.find({ company: credentials.company._id }, { user: 1 }).lean();

  const activityHistories = await ActivityHistory
    .find({
      date: { $lte: new Date(query.endDate), $gte: new Date(query.startDate) },
      user: { $in: userCompanies.map(uc => uc.user) },
    })
    .populate({
      path: 'activity',
      select: '_id',
      populate: {
        path: 'steps',
        select: '_id',
        populate: {
          path: 'subPrograms',
          select: '_id',
          populate: [
            { path: 'courses', select: 'misc format trainees', match: { format: STRICTLY_E_LEARNING } },
            { path: 'program', select: 'name' }],
        },
      },
    })
    .populate({ path: 'user', select: '_id identity picture' })
    .lean();

  return activityHistories.map(h => filterSteps(filterCourses(h)))
    .filter(h => (has(h, 'activity.steps') ? h.activity.steps.length : 0));
};
