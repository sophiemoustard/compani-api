const Activity = require('../models/Activity');
const Module = require('../models/Module');

exports.addActivity = async (moduleId, payload) => {
  const activity = await Activity.create(payload);

  return Module.findOneAndUpdate({ _id: moduleId }, { $push: { activities: activity._id } }, { new: true }).lean();
};
