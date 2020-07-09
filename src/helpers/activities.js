const Boom = require('@hapi/boom');
const Activity = require('../models/Activity');
const Module = require('../models/Module');

exports.updateActivity = async (activityId, payload) =>
  Activity.findOneAndUpdate({ _id: activityId }, { $set: payload }, { new: true }).lean();

exports.addActivity = async (moduleId, payload) => {
  const module = await Module.countDocuments({ _id: moduleId });
  if (!module) throw Boom.badRequest();

  const activity = await Activity.create(payload);
  return Module.findOneAndUpdate({ _id: moduleId }, { $push: { activities: activity._id } }, { new: true }).lean();
};
