const Boom = require('@hapi/boom');
const Activity = require('../../models/Activity');
const User = require('../../models/User');
const Course = require('../../models/Course');
const Card = require('../../models/Card');
const { SURVEY } = require('../../helpers/constants');

exports.authorizeAddActivityHistory = async (req) => {
  const activity = await Activity
    .findOne({ _id: req.payload.activity })
    .populate({
      path: 'steps',
      select: '_id -activities',
      populate: { path: 'subProgram', select: '_id -steps' },
    })
    .lean();
  const user = await User.findOne({ _id: req.payload.user }).lean();

  if (!activity || !user) throw Boom.notFound();

  const activitySubPrograms = activity.steps.map(s => s.subProgram._id);
  const coursesWithActivityAndFollowedByUser = await Course
    .countDocuments({ subProgram: { $in: activitySubPrograms }, trainees: req.payload.user });

  if (!coursesWithActivityAndFollowedByUser) throw Boom.notFound();

  for (const qa of req.payload.questionnaireAnswers) {
    const card = await Card.findOne({ _id: qa.card }).lean();
    if (!card) throw Boom.notFound();
    if (card.template !== SURVEY) throw Boom.badData();

    const activityCount = await Activity.countDocuments({ _id: req.payload.activity, cards: card._id });
    if (!activityCount) throw Boom.notFound();
  }

  return null;
};
