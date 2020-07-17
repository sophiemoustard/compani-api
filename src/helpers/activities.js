const Boom = require('@hapi/boom');
const Activity = require('../models/Activity');
const Step = require('../models/Step');

exports.getActivity = async activityId => Activity.findOne({ _id: activityId }).lean();

exports.updateActivity = async (activityId, payload) =>
  Activity.updateOne({ _id: activityId }, { $set: payload });

exports.addActivity = async (stepId, payload) => {
  const step = await Step.countDocuments({ _id: stepId });
  if (!step) throw Boom.badRequest();

  const activity = await Activity.create(payload);
  return Step.findOneAndUpdate({ _id: stepId }, { $push: { activities: activity._id } }, { new: true }).lean();
};
