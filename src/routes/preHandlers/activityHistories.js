const Boom = require('@hapi/boom');
const Activity = require('../../models/Activity');
const User = require('../../models/User');
const Course = require('../../models/Course');

exports.authorizeAddActivityHistory = async (req) => {
  const activity = await Activity.findOne({ _id: req.payload.activity })
    .populate({
      path: 'steps',
      select: '_id -activities',
      populate: { path: 'subProgram', select: '_id -steps' },
    })
    .lean();
  const user = await User.findOne({ _id: req.payload.user }).lean();

  if (!activity || !user) throw Boom.notFound();

  const activitySubPrograms = activity.steps.map(s => s.subProgram._id);
  const coursesWithActivityAndFollowedByUser = await Course.find({
    subProgram: { $in: activitySubPrograms }, trainees: req.payload.user,
  }).lean();

  if (!coursesWithActivityAndFollowedByUser || coursesWithActivityAndFollowedByUser.length === 0) throw Boom.notFound();

  return null;
};
