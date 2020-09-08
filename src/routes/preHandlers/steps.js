const Boom = require('@hapi/boom');
const Step = require('../../models/Step');
const Activity = require('../../models/Activity');

exports.authorizeActivityAdd = async (req) => {
  const step = await Step.countDocuments({ _id: req.params._id });
  if (!step) throw Boom.notFound();

  return null;
};

exports.authorizeActivityReuse = async (req) => {
  const step = await Step.findOne({ _id: req.params._id });
  if (!step) throw Boom.notFound();

  const { activities } = req.payload;
  const existingActivity = await Activity.countDocuments({ _id: activities });
  if (!existingActivity) throw Boom.badRequest();
  if (step.activities.map(a => a.toHexString()).includes(activities)) throw Boom.badRequest();

  return null;
};

exports.authorizeActivityDetachment = async (req) => {
  const step = await Step.findOne({ _id: req.params._id, activities: req.params.activityId }).lean();
  if (!step) throw Boom.notFound();

  return null;
};
