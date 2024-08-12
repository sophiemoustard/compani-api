const Boom = require('@hapi/boom');
const get = require('lodash/get');
const Activity = require('../../models/Activity');
const User = require('../../models/User');
const Course = require('../../models/Course');
const { checkAnswersList } = require('./utils');

exports.authorizeAddActivityHistory = async (req) => {
  const { user: userId, activity: activityId, questionnaireAnswersList, quizzAnswersList } = req.payload;

  const activity = await Activity.findOne({ _id: activityId })
    .populate({ path: 'steps', select: '_id -activities', populate: { path: 'subPrograms', select: '_id -steps' } })
    .lean();
  const user = await User.countDocuments({ _id: userId });

  if (!activity || !user) throw Boom.notFound();

  const activitySubPrograms = activity.steps
    .map(step => step.subPrograms)
    .flat()
    .map(s => s._id);

  const coursesWithActivityAndFollowedByUser = await Course
    .countDocuments({ subProgram: { $in: activitySubPrograms }, trainees: userId });

  if (!coursesWithActivityAndFollowedByUser) throw Boom.notFound();
  const answersList = [...(questionnaireAnswersList || []), ...(quizzAnswersList || [])];

  if (answersList) await checkAnswersList(answersList, activityId, true);

  return null;
};

exports.authorizeHistoriesList = async (req) => {
  const company = get(req, 'auth.credentials.company._id');
  if (!company) return Boom.forbidden();

  return null;
};
